import type { Field, Flow, Manifest } from "@intent0/schema";
import { buildRequest } from "./lookup";
import type { MemoryIndex } from "./search";
import { completeStep, currentStep, startFlow, FlowError, type FlowRun } from "./flow-runner";

/*
 * The same approved tasks the intent bar offers, exposed to AI agents as tools.
 * Agents get exactly what people get: only approved, enabled tasks; the site's own endpoints;
 * every step in order (no skipping OTP or verification); irreversible tasks need confirmed=true.
 */

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean };
  annotations: { title: string; readOnlyHint: boolean; destructiveHint: boolean; openWorldHint: boolean };
}

function fieldSchema(f: Field): Record<string, unknown> {
  const base = { description: f.label + (f.help ? `. ${f.help}` : "") };
  if (f.options?.length) return { ...base, type: "string", enum: f.options.map((o) => o.value) };
  if (f.type === "number") return { ...base, type: "number" };
  if (f.type === "checkbox") return { ...base, type: "boolean" };
  if (f.type === "file") return { ...base, type: "string", description: `${base.description} (file uploads are not supported for agents yet)` };
  return { ...base, type: "string", ...(f.type === "date" ? { format: "date" } : f.type === "email" ? { format: "email" } : {}) };
}

/** A tool definition (MCP / WebMCP shape) for one approved task. */
export function flowTool(flow: Flow): AgentTool {
  const fields = flow.steps.flatMap((s) => s.fields);
  const properties: Record<string, unknown> = Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f)]));
  // Only the first step's required fields are needed to start; later ones (e.g. an OTP) can come on a follow-up call.
  const required = (flow.steps[0]?.fields ?? []).filter((f) => f.required && f.type !== "file").map((f) => f.name);
  properties.resume = { type: "string", description: "The resume token from a previous call that returned status needs_input." };
  if (flow.irreversible) {
    properties.confirmed = { type: "boolean", description: "Must be true, and only after the person has reviewed the details and agreed to submit. This can't be undone." };
  }
  const multi = flow.steps.length > 1 ? ` Steps: ${flow.steps.map((s) => s.title).join(" → ")}. If a step needs more input (e.g. an OTP sent to the person), the result says which fields to send next with the resume token.` : "";
  return {
    name: flow.id,
    description: `${flow.title}. ${flow.description}${multi}${flow.irreversible ? " Irreversible: ask the person to confirm first, then call with confirmed=true." : ""}`,
    inputSchema: { type: "object", properties, required, additionalProperties: false },
    annotations: { title: flow.title, readOnlyHint: flow.steps.every((s) => s.action?.method === "GET"), destructiveHint: flow.irreversible, openWorldHint: false },
  };
}

export type SiteCall = (method: string, path: string, body: Record<string, unknown>) => Promise<{ ok: boolean; status: number; data: Record<string, unknown> }>;

export type AgentResult =
  | { status: "done"; task: string; result: Record<string, unknown> }
  | { status: "needs_input"; task: string; step: string; missing: { name: string; label: string }[]; resume: string; note?: string }
  | { status: "needs_confirmation"; task: string; message: string }
  | { status: "rejected"; task: string; step: string; message: string; fieldErrors?: unknown; resume: string };

const encode = (run: FlowRun) => btoa(unescape(encodeURIComponent(JSON.stringify(run))));
const decode = (s: string): FlowRun => JSON.parse(decodeURIComponent(escape(atob(s)))) as FlowRun;
const empty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/**
 * Runs an approved task for an agent, step by step against the site's own endpoints,
 * as far as the given values allow. Stops and says what's missing instead of guessing.
 */
export async function runFlowForAgent(manifest: Manifest, flowId: string, input: Record<string, unknown>, call: SiteCall): Promise<AgentResult> {
  const flow = manifest.status === "approved" ? manifest.flows.find((f) => f.id === flowId && f.enabled) : undefined;
  if (!flow) return { status: "rejected", task: flowId, step: "", message: "This task isn't available.", resume: "" };
  const { resume, confirmed, ...values } = input;

  let run: FlowRun;
  try {
    run = typeof resume === "string" && resume ? decode(resume) : startFlow(manifest, flowId);
    if (run.flowId !== flowId) throw new Error("resume token is for another task");
  } catch (err) {
    return { status: "rejected", task: flowId, step: "", message: `Invalid resume token: ${(err as Error).message}`, resume: "" };
  }
  run = { ...run, values: { ...run.values, ...values } };

  while (!run.done) {
    const step = currentStep(manifest, run);
    const isFinal = run.stepIndex === flow.steps.length - 1;
    const missing = step.fields.filter((f) => f.required && f.type !== "checkbox" && empty(run.values[f.name]));
    if (missing.length) {
      return {
        status: "needs_input",
        task: flowId,
        step: step.title,
        missing: missing.map((f) => ({ name: f.name, label: f.label })),
        resume: encode(run),
        ...(step.kind === "verify" ? { note: "This is a verification step: ask the person for the code they received." } : {}),
      };
    }
    if (flow.irreversible && isFinal && confirmed !== true) {
      return { status: "needs_confirmation", task: flowId, message: "Show the person the details and ask them to confirm, then call again with confirmed=true and the same values." };
    }
    const stepValues = Object.fromEntries(step.fields.map((f) => [f.name, f.type === "checkbox" ? Boolean(run.values[f.name] ?? confirmed) : run.values[f.name]]));
    const request = buildRequest(manifest, flowId, step.id, { ...run.values, ...stepValues, ...run.outputs });
    if (!request || "error" in request) {
      return { status: "rejected", task: flowId, step: step.title, message: request ? request.error : "no approved action for this step", resume: encode(run) };
    }
    const res = await call(request.method, request.path, request.body);
    if (!res.ok) {
      const msg = res.data.error ?? res.data.message;
      return {
        status: "rejected",
        task: flowId,
        step: step.title,
        message: typeof msg === "string" ? msg : `The website rejected this step (${res.status}).`,
        fieldErrors: res.data.fieldErrors ?? res.data.errors,
        resume: encode(run),
      };
    }
    try {
      run = completeStep(manifest, run, { values: stepValues, outputs: res.data });
    } catch (err) {
      return { status: "rejected", task: flowId, step: step.title, message: err instanceof FlowError ? err.message : String(err), resume: encode(run) };
    }
  }
  const returns = flow.steps.at(-1)?.action?.returns ?? [];
  return { status: "done", task: flowId, result: Object.fromEntries(returns.filter((k) => run.outputs[k] !== undefined).map((k) => [k, run.outputs[k]])) };
}

/** The read-only tool that searches the site's content (Site Memory). */
export const searchTool: AgentTool = {
  name: "search_site",
  description: "Search this website's own pages and docs. Returns matching sections with their page URL, text and exact code examples. Use it to answer questions about the site instead of guessing.",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string", description: "What to look for, e.g. 'setup with vue' or 'documents needed for passport'" } },
    required: ["query"],
    additionalProperties: false,
  },
  annotations: { title: "Search this site", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
};

/** Search results for agents: grounded sections with their URL, text and exact code. */
export function searchForAgent(index: MemoryIndex, query: string, limit = 5) {
  return index.search(query, limit).map((h) => ({
    url: `${h.page.url}${h.section.anchor ? `#${h.section.anchor}` : ""}`,
    page: h.page.title,
    heading: h.section.path.join(" › "),
    text: h.section.text.slice(0, 1_500),
    code: h.section.code.map((c) => ({ lang: c.lang, code: c.code })),
  }));
}
