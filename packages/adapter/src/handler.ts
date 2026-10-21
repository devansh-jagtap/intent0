import * as z from "zod";
import { builtinCatalog, createMcpServer, createMemoryIndex, httpSiteCall, llmsFullTxt, llmsTxt, searchForAgent, validateContentPage, validatePage, type JsonRpcRequest, type SearchHit } from "@intent0/core";
import type { ComponentCatalog, ContentPage, Flow, Manifest, PageNode, PageSpec, SiteMemory } from "@intent0/schema";
import type { JsonModel } from "./llm";
import { mockResolve, templatePage } from "./mock";
import { RESOLVE_CONTENT_RULE, answerInput, answerPrompt, generatePrompt, resolvePrompt } from "./prompts";

export interface AdapterOptions {
  manifest: Manifest;
  /** Site Memory (from `intent0 index`): lets intent0 answer with information pages, not only tasks. */
  memory?: SiteMemory | null;
  catalog?: ComponentCatalog;
  /** null = no model configured; the mock is used instead. */
  model: JsonModel | null;
  /** Where the site's own pages and endpoints are, if not where this handler runs (e.g. `intent0 serve`, or INTENT0_SITE_URL once deployed). */
  siteUrl?: string;
  version?: string;
}

const ResolveBody = z.object({ text: z.string().trim().min(1).max(500) });
const GenerateBody = z.object({ flowId: z.string(), stepId: z.string(), lang: z.string().min(2).max(10).default("en") });
const AnswerBody = z.object({ query: z.string().trim().min(1).max(500), lang: z.string().min(2).max(10).default("en") });
const ResolveReply = z.object({
  flowId: z.string().nullable().catch(null),
  confidence: z.number().min(0).max(1).catch(0),
  prefill: z.record(z.string(), z.unknown()).catch({}),
  content: z.boolean().optional().catch(undefined),
  query: z.string().optional().catch(undefined),
});

/** Where an information page's citations and code come from, sent with the page so the browser shows code verbatim. */
export interface ContentSources {
  sections: Record<string, { url: string; page: string; heading: string; anchor?: string }>;
  code: Record<string, { lang: string; code: string }>;
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

/** A plain, always-valid information page made directly from search results (no model). */
function templateAnswer(query: string, hits: SearchHit[], tasks: Flow[], lang: string): ContentPage {
  const blocks: PageNode[] = hits.slice(0, 4).map((h) => ({
    component: "Section",
    props: { heading: h.section.path.join(" › ") },
    children: [
      ...(h.section.text ? [{ component: "Paragraph", props: { text: h.section.text.slice(0, 700), cites: [h.section.id] } }] : []),
      ...h.section.code.slice(0, 3).map((c) => ({ component: "CodeBlock", props: { ref: c.id } })),
    ],
  }));
  for (const t of tasks) blocks.push({ component: "TaskCard", props: { flowId: t.id, label: t.title } });
  return { kind: "content", lang, title: query.charAt(0).toUpperCase() + query.slice(1), blocks };
}

/**
 * The server half of intent0, mounted by the website at e.g. /intent0/[action].
 * Holds the model key. Never sees the user's form data: only their request sentence.
 */
export function createIntent0Handler({ manifest, memory = null, catalog = builtinCatalog, model, siteUrl, version = "0.0.1" }: AdapterOptions) {
  // AI agents calling task tools over the web: a simple per-address limit (in memory, per server).
  const agentCalls = new Map<string, { count: number; reset: number }>();
  const AGENT_CALLS_PER_MINUTE = 30;
  const allowAgentCall = (ip: string) => {
    const now = Date.now();
    const slot = agentCalls.get(ip);
    if (!slot || slot.reset < now) {
      agentCalls.set(ip, { count: 1, reset: now + 60_000 });
      return true;
    }
    return ++slot.count <= AGENT_CALLS_PER_MINUTE;
  };
  const pageCache = new Map<string, PageSpec>();
  const answerCache = new Map<string, unknown>();
  const index = memory && memory.sections.length > 0 ? createMemoryIndex(memory) : null;
  // Only an approved manifest is served. A draft (not yet reviewed) shows nothing to users.
  const enabled = manifest.status === "approved" ? manifest.flows.filter((f) => f.enabled) : [];
  const enabledManifest: Manifest = { ...manifest, flows: enabled };
  // What the browser gets: approved, enabled flows only; no model settings.
  const publicConfig = {
    manifest: { ...manifest, model: { provider: manifest.model.provider, model: "hidden" }, flows: enabled },
    catalog,
    mode: model ? "model" : "mock",
    content: index ? { pages: memory!.pages.length, sections: memory!.sections.length } : null,
  };

  /** Tasks that look related to a request (keyword overlap), for "start this task" cards. */
  function relatedTasks(text: string, limit = 2): Flow[] {
    if (enabled.length === 0) return [];
    const best = mockResolve(enabledManifest, text);
    return best.flowId && best.confidence >= 0.34 ? enabled.filter((f) => f.id === best.flowId).slice(0, limit) : [];
  }

  async function resolve(text: string) {
    if (enabled.length === 0 && !index) return { kind: "none", flowId: null, confidence: 0, prefill: {}, via: "none" };
    if (model) {
      try {
        const system = enabled.length ? `${resolvePrompt(enabledManifest)}${index ? `\n${RESOLVE_CONTENT_RULE}` : ""}` : RESOLVE_CONTENT_RULE;
        const reply = ResolveReply.parse(await model.complete(system, `Visitor said: """${text}"""`));
        const flow = reply.flowId ? enabled.find((f) => f.id === reply.flowId) : undefined;
        if (flow && reply.confidence >= 0.5) {
          const fields = new Map(flow.steps.flatMap((s) => s.fields.map((f) => [f.name, f] as const)));
          // Keep only stated values for real fields of this task; choices must be one of the field's options.
          const prefill = Object.fromEntries(
            Object.entries(reply.prefill).filter(([k, v]) => {
              const field = fields.get(k);
              if (!field || typeof v !== "string" || v.trim() === "") return false;
              return !field.options || field.options.some((o) => o.value === v);
            }),
          );
          return { kind: "task", flowId: flow.id, confidence: reply.confidence, prefill, via: "model" };
        }
        const query = reply.query?.trim() || text;
        if (index && (reply.content || index.search(query, 1).length > 0)) {
          return { kind: "content", flowId: null, query, confidence: reply.confidence, prefill: {}, via: "model" };
        }
        return { kind: "none", flowId: null, confidence: reply.confidence, prefill: {}, via: "model" };
      } catch (err) {
        console.warn("[intent0] model resolve failed, using keyword match:", (err as Error).message);
      }
    }
    const match = enabled.length ? mockResolve(enabledManifest, text) : { flowId: null, confidence: 0 };
    if (match.flowId) return { kind: "task", ...match, prefill: {}, via: "mock" };
    if (index && index.search(text, 1).length > 0) return { kind: "content", flowId: null, query: text, confidence: 0.5, prefill: {}, via: "mock" };
    return { kind: "none", ...match, prefill: {}, via: "mock" };
  }

  async function answer(query: string, lang: string): Promise<Response> {
    if (!index) return json({ error: "this site has no Site Memory; run `intent0 index`" }, 404);
    const key = `${query.toLowerCase()}:${lang}`;
    const cached = answerCache.get(key);
    if (cached) return json({ ...(cached as object), via: "cache" });

    const hits = index.search(query, 6);
    if (hits.length === 0) {
      return json({ page: null, message: "I couldn't find this on the website.", sources: { sections: {}, code: {} } });
    }
    const tasks = relatedTasks(query);
    const sources: ContentSources = { sections: {}, code: {} };
    for (const h of hits) {
      sources.sections[h.section.id] = { url: h.page.url, page: h.page.title, heading: h.section.path.join(" › "), ...(h.section.anchor ? { anchor: h.section.anchor } : {}) };
      for (const c of h.section.code) sources.code[c.id] = { lang: c.lang, code: c.code };
    }
    const allowed = { sectionIds: new Set(Object.keys(sources.sections)), codeIds: new Set(Object.keys(sources.code)), flowIds: new Set(enabled.map((f) => f.id)) };

    let page: ContentPage | null = null;
    let via = "template";
    let warning: string | undefined;
    if (model) {
      let feedback = "";
      for (let attempt = 0; attempt < 2 && !page; attempt++) {
        try {
          const candidate = await model.complete(answerPrompt(lang), `${answerInput(query, hits, tasks.length ? tasks : enabled.slice(0, 6))}${feedback}`);
          const check = validateContentPage(candidate, allowed);
          if (check.ok) {
            page = check.page;
            via = "model";
          } else {
            warning = check.errors.slice(0, 6).join("; ");
            feedback = `\nYour previous answer was rejected: ${warning}. Fix these.`;
          }
        } catch (err) {
          warning = (err as Error).message;
          break;
        }
      }
    }
    // No model, or it couldn't follow the rules: show the matching sections themselves.
    page ??= templateAnswer(query, hits, tasks, lang);
    // Send only the sources the page actually uses.
    const used = JSON.stringify(page);
    const body = {
      page,
      sources: {
        sections: Object.fromEntries(Object.entries(sources.sections).filter(([id]) => used.includes(`"${id}"`))),
        code: Object.fromEntries(Object.entries(sources.code).filter(([id]) => used.includes(`"${id}"`))),
      },
    };
    if (via === "model") {
      if (answerCache.size > 200) answerCache.clear();
      answerCache.set(key, body);
    }
    return json({ ...body, via, ...(warning && via !== "model" ? { warning } : {}) });
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

      // Raw, grounded search results for AI agents (the intent bar's search tool, MCP).
      if (action === "search" && request.method === "POST") {
        const body = z.object({ query: z.string().trim().min(1).max(500) }).safeParse(await request.json().catch(() => null));
        if (!body.success) return json({ error: "send {query}" }, 400);
        return json({ results: index ? searchForAgent(index, body.data.query) : [] });
      }

      // The machine version of the site (llms.txt format), for AI agents and crawlers.
      if ((action === "llms.txt" || action === "llms-full.txt") && request.method === "GET") {
        const here = new URL(request.url).origin;
        const site = siteUrl ? new URL(siteUrl).origin : here;
        const body = action === "llms.txt" ? llmsTxt(manifest, memory, site, `${here}/intent0/mcp`) : llmsFullTxt(manifest, memory, site);
        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
      }

      // MCP over HTTP (Streamable HTTP, JSON replies): any AI agent can use the site's public tasks and search.
      if (action === "mcp") {
        if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
        const raw: unknown = await request.json().catch(() => undefined);
        if (raw === undefined) return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
        const server = createMcpServer({ manifest: enabledManifest, index, call: httpSiteCall(siteUrl ?? new URL(request.url).origin, "intent0-agent"), version });
        const one = async (message: unknown) => {
          const msg = (message && typeof message === "object" ? message : {}) as JsonRpcRequest;
          const tool = msg.method === "tools/call" ? String(msg.params?.name ?? "") : "";
          if (tool && tool !== "search_site" && !allowAgentCall(ip))
            return { jsonrpc: "2.0" as const, id: msg.id ?? null, error: { code: -32000, message: "Too many task calls; wait a minute and try again." } };
          return server.handle(message);
        };
        const replies = (await Promise.all((Array.isArray(raw) ? raw : [raw]).map(one))).filter((r) => r !== null);
        // Only notifications: accepted, nothing to say.
        if (replies.length === 0) return new Response(null, { status: 202 });
        return json(Array.isArray(raw) ? replies : replies[0]);
      }

      if (action === "answer" && request.method === "POST") {
        const body = AnswerBody.safeParse(await request.json().catch(() => null));
        if (!body.success) return json({ error: "send {query, lang}" }, 400);
        return await answer(body.data.query, body.data.lang);
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      console.error("[intent0]", err);
      return json({ error: `intent0 adapter error: ${(err as Error).message}` }, 502);
    }
  };
}
