import { ModelError, type JsonModel } from "@intent0/adapter";
import { Manifest, formatIssues, pathParams, type ModelConfig } from "@intent0/schema";
import { objectKeys } from "./keys";
import type { ScanResult } from "./scan";

/*
 * Manifest generation in two small steps, so it works on free tiers with tight limits:
 *   A. plan:   one short call → the list of user tasks and which routes they call (no fields).
 *   B. detail: one call per task → its fields in a compact format, given only the part of the
 *              code that task needs. intent0 expands the compact format into the manifest itself.
 * Every model answer is checked: tasks must call routes that really exist, and the result must
 * pass the manifest schema; a task that can't be made valid is dropped, never guessed.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** True if a manifest path (concrete or with {placeholders}) is an instance of a scanned route like /api/status/[id]. */
export function routeMatches(routePath: string, manifestPath: string): boolean {
  const a = routePath.split("/").filter(Boolean);
  const b = manifestPath.split("?")[0]!.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((seg, i) => (/^\[.+\]$/.test(seg) ? b[i]!.length > 0 : seg === b[i]));
}

interface CallState {
  maxTokens?: number;
  /** 0 = full context, 1+ = smaller context after a "request too large". */
  shrink: number;
}

/** Calls the model, waiting out rate limits and shrinking the request when the provider asks. */
async function ask(
  model: JsonModel,
  system: string,
  user: (state: CallState) => string,
  log: (s: string) => void,
): Promise<unknown> {
  const state: CallState = { shrink: 0 };
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await model.complete(system, user(state), undefined, { maxTokens: state.maxTokens });
    } catch (err) {
      if (!(err instanceof ModelError)) throw err;
      if (err.outputLimit && (!state.maxTokens || state.maxTokens > err.outputLimit)) {
        state.maxTokens = Math.max(256, err.outputLimit - 32);
        log(`    Model allows at most ${err.outputLimit} reply tokens on this plan; asking for shorter replies…`);
        continue;
      }
      if (err.inputTooLarge && state.shrink < 2) {
        state.shrink++;
        log("    Request too large for this model's limits; sending a smaller part of the code…");
        continue;
      }
      if (err.status === 429 && err.retryAfterMs !== undefined && err.retryAfterMs <= 120_000) {
        log(`    Rate limit reached; waiting ${Math.ceil(err.retryAfterMs / 1000)}s…`);
        await sleep(err.retryAfterMs + 500);
        continue;
      }
      if (err.status === 429 && attempt < 3) {
        log("    Rate limit reached; waiting 20s…");
        await sleep(20_000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("The model kept refusing requests (rate limits). Try again in a minute or use a model with higher limits.");
}

// ---------- Step A: plan ----------

interface PlannedStep {
  id: string;
  title: string;
  kind?: string;
  method: string;
  path: string;
  needs?: string[];
}
interface PlannedFlow {
  id: string;
  title: string;
  description: string;
  examples?: string[];
  auth?: string;
  irreversible?: boolean;
  enabled?: boolean;
  fallbackPath: string;
  steps: PlannedStep[];
}

const PLAN_SYSTEM = [
  "You map an existing website's backend into user tasks for intent0, a layer that guides people through those tasks.",
  "You get a static scan: API routes, forms, page URLs and the code files the routes use.",
  'Reply with only JSON: {"flows":[{"id","title","description","examples":[..],"auth","irreversible","enabled","fallbackPath","steps":[{"id","title","kind","method","path","needs":[]}]}]}',
  "Rules:",
  "- One flow per real thing a citizen/customer does (apply, register, book, submit, track…). Not one per endpoint.",
  "- Skip admin, login/session, health checks and read-only listing endpoints (lists of services/notices); they are not user tasks.",
  "- steps = the API calls the task makes, in order. Use only routes and methods from the scan.",
  "- Routes with [param]: if the value is from a fixed list in the code (e.g. service slugs), make one flow per value with the concrete path (/api/applications/passport). If the user types it (an id to look up), write {fieldName} in the path (/api/status/{referenceId}).",
  "- ids: lowercase snake_case. kind: form, verify, review or info.",
  '- auth: "signed_in" if the route needs a logged-in user, else "public".',
  "- irreversible: true if the task submits an application, pays, cancels or deletes.",
  "- enabled: false for destructive tasks (delete, cancel, close account).",
  "- fallbackPath: the page URL where the site's own form for this task is, from the pages list, with [param] filled in (/services/passport/apply).",
  "- examples: 2-4 short ways a real person would ask for this task.",
].join("\n");

function planInput(scan: ScanResult, shrink: number): string {
  const cap = [3_000, 1_500, 600][shrink] ?? 600;
  return JSON.stringify({
    routes: scan.routes.map(({ file: _f, excerpt, ...r }) => (shrink === 0 ? { ...r, excerpt: excerpt.slice(0, 500) } : r)),
    forms: scan.forms.map((f) => ({ page: f.page, file: f.file, fields: f.fields.map((x) => x.name), calls: f.calls })),
    pages: scan.pages ?? [],
    code: (scan.supporting ?? []).map((f) => ({ file: f.file, start: f.content.slice(0, cap) })),
  });
}

const SKIP_ROUTE = /\/(admin|auth|login|logout|session|health)(\/|$)/;

/**
 * Endpoints no planned task uses but probably should:
 *  - concrete paths in the code that instantiate a dynamic route a task already uses
 *    (e.g. "/api/applications/income-certificate" when passport and birth-certificate were planned);
 *  - static routes that change data (POST/PUT/PATCH), outside admin/auth/health.
 */
function uncoveredEndpoints(scan: ScanResult, planned: PlannedFlow[]): string[] {
  const used = planned.flatMap((f) => f.steps.map((s) => s.path));
  const isUsed = (routePath: string) => used.some((u) => routeMatches(routePath, u));
  const dynamic = scan.routes.filter((r) => r.path.includes("[") && !SKIP_ROUTE.test(r.path) && isUsed(r.path));
  const literals = new Set<string>();
  const text = (scan.supporting ?? []).map((f) => f.content).join("\n") + JSON.stringify(scan.forms);
  for (const m of text.matchAll(/["'`](\/[A-Za-z0-9_\-/]+)["'`]/g)) literals.add(m[1]!);
  const fromCode = [...literals].filter((p) => dynamic.some((r) => routeMatches(r.path, p)) && !used.includes(p));
  const staticWrites = scan.routes
    .filter((r) => !r.path.includes("[") && !SKIP_ROUTE.test(r.path) && r.methods.some((m) => m !== "GET") && !isUsed(r.path))
    .map((r) => r.path);
  return [...new Set([...fromCode, ...staticWrites])];
}

/** A task outline built from a route alone, e.g. POST /api/contact → "Contact" with fallback page /contact. */
function outlineFor(scan: ScanResult, path: string): PlannedFlow | null {
  const route = scan.routes.find((r) => routeMatches(r.path, path));
  const method = route?.methods.find((m) => m !== "GET");
  if (!route || !method) return null;
  const segs = path.split("/").filter((s) => s && s !== "api" && !s.startsWith("{"));
  const last = segs.at(-1) ?? "task";
  const singular = last.replace(/ies$/, "y").replace(/s$/, "");
  const words = singular.replace(/[-_]+/g, " ");
  const title = words.replace(/^./, (c) => c.toUpperCase());
  const isApplication = segs.some((s) => /application|apply/.test(s));
  const page =
    (scan.pages ?? []).find((p) => p.split("/").includes(last) || p.split("/").includes(singular)) ??
    (scan.pages ?? []).map((p) => p.replace(/\[[^\]]+\]/, last)).find((p) => p.includes(`/${last}/`) && /apply|new|form/.test(p)) ??
    "/";
  return {
    id: `${isApplication ? "apply" : "submit"}_${singular.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
    title: isApplication ? `Apply for ${words}` : title,
    description: `${isApplication ? "Apply for" : "Send"} ${words} on this website.`,
    examples: [words, `${isApplication ? "apply for" : "submit"} ${words}`],
    auth: "public",
    irreversible: isApplication,
    enabled: true,
    fallbackPath: page,
    steps: [{ id: singular.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "details", title: `${title} details`, kind: "form", method, path }],
  };
}

/** What the code itself says: string literals, option label→value pairs, and keys of JSON replies. */
function codeFacts(scan: ScanResult) {
  const text = [...(scan.supporting ?? []).map((f) => f.content), ...scan.routes.map((r) => r.excerpt)].join("\n");
  const literals = new Set<string>();
  for (const m of text.matchAll(/["'`]([^"'`\n]{1,80})["'`]/g)) literals.add(m[1]!);
  for (const f of scan.forms) for (const x of f.fields) for (const o of x.options ?? []) literals.add(o.value);
  const valueByLabel = new Map<string, string>();
  for (const m of text.matchAll(/value\s*:\s*["'`]([^"'`]+)["'`]\s*,\s*label\s*:\s*["'`]([^"'`]+)["'`]/g)) valueByLabel.set(m[2]!.toLowerCase(), m[1]!);
  for (const m of text.matchAll(/label\s*:\s*["'`]([^"'`]+)["'`]\s*,\s*value\s*:\s*["'`]([^"'`]+)["'`]/g)) valueByLabel.set(m[1]!.toLowerCase(), m[2]!);
  const replyKeys = new Set<string>(scan.routes.flatMap((r) => r.outputs));
  for (const m of text.matchAll(/\.json\(\s*\{([^}]*)\}/g)) for (const k of objectKeys(m[1]!)) replyKeys.add(k);
  return { literals, valueByLabel, replyKeys };
}

/** Corrects option values and return keys against the code; the model's text is never the final word. */
function groundInCode(flow: ReturnType<typeof buildFlow>, facts: ReturnType<typeof codeFacts>) {
  const lowerLiterals = new Map([...facts.literals].map((l) => [l.toLowerCase(), l]));
  for (const step of flow.steps) {
    for (const field of step.fields as { options?: { value: string; label: string }[] }[]) {
      for (const o of field.options ?? []) {
        // 1) the code pairs this label with a value → use that value (fixes "Transport" vs "transport");
        // 2) the value matches a string in the code except for case → use the code's spelling.
        const byLabel = facts.valueByLabel.get(o.label.toLowerCase()) ?? facts.valueByLabel.get(o.value.toLowerCase());
        o.value = byLabel ?? (facts.literals.has(o.value) ? o.value : (lowerLiterals.get(o.value.toLowerCase()) ?? o.value));
      }
    }
    if (facts.replyKeys.size > 0) {
      const ok = step.action.returns.filter((k) => facts.replyKeys.has(k));
      // Keep reference numbers and statuses the API is known to send, even if the model forgot them.
      const useful = [...facts.replyKeys].filter((k) => /^(reference\w*|status|\w+[a-z]Id|\w+_id|\w+Number|\w+_number)$/.test(k));
      step.action.returns = [...new Set([...ok, ...(ok.length === 0 || !ok.some((k) => useful.includes(k)) ? useful : [])])];
    }
  }
  return flow;
}

// ---------- Step B: details per flow ----------

/** A field as the model writes it: [name, label, type, required, options?]; an option is "value" or [value, label]. */
type CompactField = [string, string, string, boolean?, (string | [string, string])[]?];

const DETAIL_SYSTEM = [
  "You describe the input fields of one task on a website, for intent0.",
  "You get the task, its API route(s), and the code that defines or validates that route's input.",
  'Reply with only JSON: {"steps":[{"id":"<step id>","fields":[["name","Label","type",required,options?]],"returns":["key"]}]}',
  "Rules:",
  "- One entry per input the API accepts for that step. name = the EXACT key the API expects (same spelling and case).",
  "- type: text, email, phone, number, date, textarea, select, radio, checkbox, file or otp.",
  '- options (only for select/radio): every allowed value, exactly as the code has it. Write "Value" when the shown label is the same, or ["value","Label"] when different.',
  "- Take labels, required flags and options from the code (a forms/config file if there is one). Do not invent fields or options.",
  "- A {placeholder} in a step's path is a field of that step too.",
  "- returns: top-level keys of the JSON the API answers with that matter to the user or later steps (e.g. referenceId, status).",
].join("\n");

/** The parts of the code most relevant to one flow: text around its route segments and id words. */
function relevantCode(scan: ScanResult, flow: PlannedFlow, shrink: number): { file: string; code: string }[] {
  const window = [7_000, 3_500, 1_800][shrink] ?? 1_800;
  const words = new Set<string>();
  for (const s of flow.steps) for (const seg of s.path.split("/")) if (seg && !seg.startsWith("{") && seg !== "api") words.add(seg.toLowerCase());
  for (const w of flow.id.split("_")) if (w.length > 3 && !["apply", "submit", "track", "check", "request", "application"].includes(w)) words.add(w);

  const out: { file: string; code: string }[] = [];
  for (const f of scan.supporting ?? []) {
    const lower = f.content.toLowerCase();
    let best = -1;
    for (const w of words) {
      const i = lower.indexOf(w.replace(/_/g, "-"));
      const j = i === -1 ? lower.indexOf(w) : i;
      if (j !== -1 && (best === -1 || j < best)) best = j;
    }
    if (best === -1) continue;
    const start = Math.max(0, best - 400);
    out.push({ file: f.file, code: f.content.slice(start, start + window) });
  }
  // Shared field definitions are often at the top of a forms file (e.g. a reusable "applicant" block).
  const head = (scan.supporting ?? [])[0];
  if (head && shrink === 0 && !out.some((o) => o.file === head.file && head.content.indexOf(o.code) === 0)) {
    out.push({ file: `${head.file} (start)`, code: head.content.slice(0, 2_500) });
  }
  return out;
}

function detailInput(scan: ScanResult, flow: PlannedFlow, shrink: number, feedback: string): string {
  const routes = flow.steps.map((s) => {
    const r = scan.routes.find((x) => x.methods.includes(s.method) && routeMatches(x.path, s.path));
    return { step: s.id, method: s.method, path: s.path, route: r ? { inputs: r.inputs, outputs: r.outputs, excerpt: shrink ? undefined : r.excerpt } : undefined };
  });
  const forms = scan.forms.filter((f) => f.page && flow.fallbackPath.startsWith(f.page.replace(/\[[^\]]+\]/g, "")));
  return JSON.stringify({
    task: { id: flow.id, title: flow.title, description: flow.description },
    steps: routes,
    forms,
    code: relevantCode(scan, flow, shrink),
  }) + feedback;
}

function expandOption(o: unknown): { value: string; label: string } | null {
  if (typeof o === "string") return { value: o, label: o };
  if (Array.isArray(o) && typeof o[0] === "string") return { value: o[0], label: typeof o[1] === "string" ? o[1] : o[0] };
  if (o && typeof o === "object" && "value" in o) {
    const v = String((o as { value: unknown }).value);
    return { value: v, label: String((o as { label?: unknown }).label ?? v) };
  }
  return null;
}

function expandField(f: unknown) {
  if (Array.isArray(f)) {
    const [name, label, type, required, options] = f as CompactField;
    const opts = Array.isArray(options) ? options.map(expandOption).filter((o): o is { value: string; label: string } => o !== null) : undefined;
    return { name, label: label || name, type, required: required !== false, ...(opts && opts.length ? { options: opts } : {}) };
  }
  return f; // already in full form
}

const humanize = (k: string) => k.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

/** Builds the full manifest flow from the plan + the model's compact field lists. */
function buildFlow(plan: PlannedFlow, detail: unknown) {
  const detailSteps = Array.isArray((detail as { steps?: unknown })?.steps) ? ((detail as { steps: unknown[] }).steps as Record<string, unknown>[]) : [];
  const seen = new Set<string>();
  const outputs: string[] = [];
  const steps = plan.steps.map((s, i) => {
    const d = detailSteps.find((x) => x.id === s.id) ?? detailSteps[i] ?? {};
    const fields = (Array.isArray(d.fields) ? d.fields.map(expandField) : []) as { name: string; label: string; type: string; required: boolean }[];
    // Every {placeholder} in the path must be a field the user fills in.
    for (const p of pathParams(s.path)) {
      if (!fields.some((f) => f.name === p) && !outputs.includes(p)) fields.push({ name: p, label: humanize(p), type: "text", required: true });
    }
    // A field belongs to the first step that asks for it.
    const own = fields.filter((f) => f && typeof f.name === "string" && !seen.has(f.name));
    own.forEach((f) => seen.add(f.name));
    const needs = (s.needs ?? []).filter((n) => outputs.includes(n));
    const returns = Array.isArray(d.returns) ? (d.returns as unknown[]).filter((r): r is string => typeof r === "string") : [];
    const sends = [...new Set([...own.map((f) => f.name), ...needs, ...pathParams(s.path).filter((p) => outputs.includes(p))])];
    outputs.push(...returns);
    return {
      id: s.id,
      title: s.title,
      kind: ["form", "verify", "review", "info"].includes(s.kind ?? "") ? s.kind : "form",
      fields: own,
      action: { method: s.method, path: s.path, sends, returns },
      needs,
    };
  });
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description || plan.title,
    examples: (plan.examples ?? []).filter((e) => typeof e === "string").slice(0, 4),
    enabled: plan.enabled !== false,
    irreversible: plan.irreversible === true,
    auth: plan.auth === "signed_in" ? "signed_in" : "public",
    fallbackPath: plan.fallbackPath?.startsWith("/") ? plan.fallbackPath : "/",
    steps,
  };
}

export interface GenerateOptions {
  model: JsonModel;
  site: { id: string; name: string; baseUrl: string };
  modelConfig: ModelConfig;
}

export async function generateManifest(
  scan: ScanResult,
  opts: GenerateOptions,
  log: (s: string) => void,
): Promise<{ manifest: Manifest; dropped: string[] }> {
  const exists = (method?: string, path?: string) =>
    Boolean(method && path && scan.routes.some((r) => r.methods.includes(method) && routeMatches(r.path, path)));
  const dropped: string[] = [];

  // A. Plan
  log("  Finding the tasks people can do on your site…");
  const planReply = await ask(opts.model, PLAN_SYSTEM, (st) => `Scan:\n${planInput(scan, st.shrink)}`, log);
  const planned = (Array.isArray((planReply as { flows?: unknown })?.flows) ? (planReply as { flows: PlannedFlow[] }).flows : []).filter((f) => {
    if (!f || typeof f.id !== "string" || !Array.isArray(f.steps) || f.steps.length === 0) return false;
    const bad = f.steps.find((s) => !exists(s.method, s.path));
    if (bad) dropped.push(`${f.id} (uses ${bad.method} ${bad.path}, which doesn't exist)`);
    return !bad;
  });
  // Coverage check: concrete endpoints written in the code (e.g. "/api/applications/income-certificate"
  // in a forms config) that match a scanned dynamic route but that no planned task uses. Models
  // sometimes skip one of a list; ask again about exactly those instead of trusting the plan.
  const missed = uncoveredEndpoints(scan, planned);
  if (missed.length > 0) {
    log(`  Checking ${missed.length} endpoint(s) the first pass skipped: ${missed.join(", ")}`);
    const more = await ask(
      opts.model,
      PLAN_SYSTEM,
      (st) => `Scan:\n${planInput(scan, st.shrink)}\nYou already planned: ${planned.map((f) => f.id).join(", ")}.\nPlan flows ONLY for these endpoints (one per real user task; reply {"flows":[]} if they are not user tasks): ${missed.join(", ")}`,
      log,
    );
    for (const f of (more as { flows?: PlannedFlow[] })?.flows ?? []) {
      if (f && Array.isArray(f.steps) && f.steps.length > 0 && f.steps.every((s) => exists(s.method, s.path))) planned.push(f);
    }
    // Still not covered: outline the task from the route and page names; step B fills in its fields.
    const usedNow = planned.flatMap((f) => f.steps.map((s) => s.path));
    for (const path of missed.filter((p) => !usedNow.includes(p))) {
      const stub = outlineFor(scan, path);
      if (stub) {
        planned.push(stub);
        log(`    Added "${stub.title}" from the route itself`);
      }
    }
  }

  const ids = new Set<string>();
  const unique = planned.filter((f) => !ids.has(f.id) && ids.add(f.id));
  log(`  ${unique.length} task(s): ${unique.map((f) => f.id).join(", ")}`);

  // B. Details, one task at a time
  const facts = codeFacts(scan);
  const flows: unknown[] = [];
  for (const plan of unique) {
    log(`  Reading fields for "${plan.title}"…`);
    let feedback = "";
    let built: unknown = null;
    for (let attempt = 0; attempt < 2 && !built; attempt++) {
      try {
        const detail = await ask(opts.model, DETAIL_SYSTEM, (st) => detailInput(scan, plan, st.shrink, feedback), log);
        const flow = groundInCode(buildFlow(plan, detail), facts);
        const check = Manifest.safeParse({ schemaVersion: 1, site: opts.site, revision: 1, status: "draft", model: opts.modelConfig, flows: [flow] });
        if (check.success) built = check.data.flows[0];
        else feedback = `\nYour previous answer had problems; fix them:\n${formatIssues(check.error).slice(0, 10).join("\n")}`;
      } catch (err) {
        if (!(err instanceof SyntaxError) && !/no JSON object/.test((err as Error).message)) throw err;
        feedback = "\nYour previous answer was not valid JSON. Reply with only the JSON object.";
      }
    }
    if (built) flows.push(built);
    else dropped.push(`${plan.id} (couldn't describe its fields reliably; add it by hand if needed)`);
  }

  if (flows.length === 0) throw new Error(`No task could be mapped safely.${dropped.length ? `\n  ${dropped.join("\n  ")}` : ""}`);
  const manifest = Manifest.parse({ schemaVersion: 1, site: opts.site, revision: 1, status: "draft", model: opts.modelConfig, flows });
  return { manifest, dropped };
}
