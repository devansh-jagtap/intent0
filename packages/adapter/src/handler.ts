import * as z from "zod";
import { builtinCatalog, validatePage } from "@intent0/core";
import type { ComponentCatalog, Manifest, PageSpec } from "@intent0/schema";
import type { JsonModel } from "./llm";
import { mockResolve, templatePage } from "./mock";
import { generatePrompt, resolvePrompt } from "./prompts";

export interface AdapterOptions {
  manifest: Manifest;
  catalog?: ComponentCatalog;
  /** null = no model configured; the mock is used instead. */
  model: JsonModel | null;
}

const ResolveBody = z.object({ text: z.string().trim().min(1).max(500) });
const GenerateBody = z.object({ flowId: z.string(), stepId: z.string(), lang: z.string().min(2).max(10).default("en") });
const ResolveReply = z.object({
  flowId: z.string().nullable(),
  confidence: z.number().min(0).max(1).catch(0),
  prefill: z.record(z.string(), z.unknown()).catch({}),
});

const json = (data: unknown, status = 200) => Response.json(data, { status });

/**
 * The server half of intent0, mounted by the website at e.g. /intent0/[action].
 * Holds the model key. Never sees the user's form data: only their request sentence.
 */
export function createIntent0Handler({ manifest, catalog = builtinCatalog, model }: AdapterOptions) {
  const pageCache = new Map<string, PageSpec>();
  // Only an approved manifest is served. A draft (not yet reviewed) shows nothing to users.
  const enabled = manifest.status === "approved" ? manifest.flows.filter((f) => f.enabled) : [];
  // What the browser gets: approved, enabled flows only; no model settings.
  const publicConfig = {
    manifest: { ...manifest, model: { provider: manifest.model.provider, model: "hidden" }, flows: enabled },
    catalog,
    mode: model ? "model" : "mock",
  };

  async function resolve(text: string) {
    if (enabled.length === 0) return { flowId: null, confidence: 0, prefill: {}, via: "none" };
    if (model) {
      try {
        const reply = ResolveReply.parse(await model.complete(resolvePrompt(manifest), `Visitor said: """${text}"""`));
        const flow = reply.flowId ? enabled.find((f) => f.id === reply.flowId) : undefined;
        if (!flow || reply.confidence < 0.5) return { flowId: null, confidence: reply.confidence, prefill: {}, via: "model" };
        const fields = new Map(flow.steps.flatMap((s) => s.fields.map((f) => [f.name, f] as const)));
        // Keep only stated values for real fields of this task; choices must be one of the field's options.
        const prefill = Object.fromEntries(
          Object.entries(reply.prefill).filter(([k, v]) => {
            const field = fields.get(k);
            if (!field || typeof v !== "string" || v.trim() === "") return false;
            return !field.options || field.options.some((o) => o.value === v);
          }),
        );
        return { flowId: flow.id, confidence: reply.confidence, prefill, via: "model" };
      } catch (err) {
        console.warn("[intent0] model resolve failed, using keyword match:", (err as Error).message);
      }
    }
    return { ...mockResolve(manifest, text), prefill: {}, via: "mock" };
  }

  async function generate(flowId: string, stepId: string, lang: string): Promise<Response> {
    const flow = enabled.find((f) => f.id === flowId);
    if (!flow) return json({ error: "unknown, disabled or unapproved flow" }, 404);
    const stepIndex = flow.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return json({ error: "unknown step" }, 404);

    const key = `${flowId}:${stepId}:${lang}`;
    const cached = pageCache.get(key);
    if (cached) return json({ page: cached, via: "cache" });

    if (!model) {
      const page = templatePage(flow, stepIndex, lang);
      pageCache.set(key, page);
      return json({ page, via: "mock" });
    }

    let feedback = "";
    let problem = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const candidate = await model.complete(generatePrompt(flow, stepIndex, catalog, lang), `Generate the page.${feedback}`);
        const check = validatePage(candidate, manifest, catalog);
        if (check.ok) {
          pageCache.set(key, check.page);
          return json({ page: check.page, via: "model" });
        }
        problem = `invalid page: ${check.errors.slice(0, 8).join("; ")}`;
        feedback = `\nYour previous answer was rejected: ${check.errors.slice(0, 8).join("; ")}. Fix these.`;
      } catch (err) {
        problem = (err as Error).message;
        break;
      }
    }
    // The model couldn't produce a valid page. Build the safe template from the approved
    // manifest instead, so the user still gets a page. Not cached, so the model is retried next time.
    console.warn(`[intent0] model page for ${key} failed (${problem}); using template page`);
    return json({ page: templatePage(flow, stepIndex, lang), via: "template", warning: problem });
  }

  return async function handle(request: Request, action: string): Promise<Response> {
    try {
      if (action === "config" && request.method === "GET") return json(publicConfig);

      if (action === "resolve" && request.method === "POST") {
        const body = ResolveBody.safeParse(await request.json().catch(() => null));
        if (!body.success) return json({ error: "send {text}" }, 400);
        return json(await resolve(body.data.text));
      }

      if (action === "generate" && request.method === "POST") {
        const body = GenerateBody.safeParse(await request.json().catch(() => null));
        if (!body.success) return json({ error: "send {flowId, stepId, lang}" }, 400);
        return await generate(body.data.flowId, body.data.stepId, body.data.lang);
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      console.error("[intent0]", err);
      return json({ error: `intent0 adapter error: ${(err as Error).message}` }, 502);
    }
  };
}
