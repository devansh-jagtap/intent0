import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { createIntent0Handler, modelFromEnv, openAiCompatible } from "@intent0/adapter";
import { agentFlows, flowTool, searchTool } from "@intent0/core";
import { Manifest, SiteMemory, formatIssues } from "@intent0/schema";
import * as z from "zod";
import { dashboardPage } from "./dashboard-page";
import { buildMemory, topTopics } from "./index-content";
import type { Project } from "./project";
import { PROVIDERS } from "./providers";
import { ensureEnvIgnored, manifestPath, memoryPath, readEnv, writeEnv, writeManifest, writeMemory } from "./write";

/*
 * `intent0 dashboard`: a local page for the company to look after its intent0 setup without
 * editing JSON by hand: review and approve tasks, rebuild Site Memory, change the model, see
 * what agents get, and try a request. It runs on the developer's machine, next to the files it
 * edits, and only answers 127.0.0.1 with a per-run secret token, so other websites open in
 * the same browser can't use it. The model key can be replaced but is never sent to the page.
 * The intent0 website's Dashboard page can use the same API from the browser (CORS for that
 * origin only, still with the token).
 */

/** The intent0 website, whose Dashboard page can connect to this command. Override with INTENT0_WEBSITE. */
export const WEBSITE = (process.env.INTENT0_WEBSITE ?? "http://localhost:3200").replace(/\/$/, "");

export interface DashboardOptions {
  project: Project;
  /** Random per-run secret; every API call must carry it. */
  token: string;
  version: string;
  log?: (s: string) => void;
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

const SaveBody = z.object({ manifest: z.unknown(), baseRevision: z.number().int() });
// The website's Dashboard sends a preset name and may leave the base URL / model empty to use the preset's.
const withPreset = (body: unknown) => {
  if (!body || typeof body !== "object") return body;
  const b = body as Record<string, unknown>;
  const preset = typeof b.provider === "string" ? PROVIDERS[b.provider] : undefined;
  return preset ? { ...b, baseUrl: b.baseUrl || preset.baseUrl, model: b.model || preset.model } : body;
};
const ModelBody = z.preprocess(
  withPreset,
  z.object({
    baseUrl: z.url(),
    model: z.string().trim().min(1).max(200),
    apiKey: z.string().trim().max(500).optional(),
  }),
);
const TryBody = z.object({ text: z.string().trim().min(1).max(500) });
const FlowBody = z.object({ id: z.string(), enabled: z.boolean().optional(), alsoNeedApproved: z.boolean().optional() });

function sameToken(given: string | null, token: string) {
  if (!given || given.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(token));
}

async function reachable(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** The dashboard's routes on standard Request/Response, so they can be tested without a socket. */
export function createDashboardHandler({ project, token, version, log = () => {} }: DashboardOptions) {
  const readJson = (file: string): unknown => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);

  function loadManifest() {
    const raw = readJson(manifestPath(project));
    if (!raw) return { raw: null, manifest: null, issues: ["No intent0.manifest.json yet. Run `npx intent0 init` first."] };
    const parsed = Manifest.safeParse(raw);
    return parsed.success ? { raw, manifest: parsed.data, issues: [] } : { raw, manifest: null, issues: formatIssues(parsed.error) };
  }

  function loadMemory() {
    const parsed = SiteMemory.safeParse(readJson(memoryPath(project)));
    return parsed.success ? parsed.data : null;
  }

  function state() {
    const { raw, manifest, issues } = loadManifest();
    const memory = loadMemory();
    const env = readEnv(project);
    const flows = manifest ? agentFlows(manifest) : [];
    const tools = [...flows.map(flowTool), ...(memory?.sections.length ? [searchTool] : [])];
    return {
      version,
      project: { name: project.name, mode: project.mode, root: project.root },
      manifest: raw,
      issues,
      memory: memory && {
        builtAt: memory.builtAt,
        pages: memory.pages.map((p) => ({ url: p.url, title: p.title, sections: memory.sections.filter((s) => s.page === p.id).length })),
        sections: memory.sections.length,
        codeBlocks: memory.sections.reduce((n, s) => n + s.code.length, 0),
        topics: topTopics(memory),
      },
      // Never the key itself: only whether one is set.
      model: { provider: manifest?.model.provider ?? null, baseUrl: env.LLM_BASE_URL ?? "", model: env.LLM_MODEL ?? "", keySet: Boolean(env.LLM_API_KEY) },
      presets: PROVIDERS,
      agents: {
        tools: tools.map((t) => ({ name: t.name, description: t.description, destructive: t.annotations.destructiveHint })),
        httpPath: "/intent0/mcp",
        siteUrl: manifest?.site.baseUrl ?? null,
      },
    };
  }

  /** Saving is approving: a person reviewed these tasks, so they're validated, approved and the revision goes up. */
  function save(body: z.infer<typeof SaveBody>) {
    const current = loadManifest();
    const onDisk = (current.raw as { revision?: number } | null)?.revision;
    if (onDisk !== undefined && onDisk !== body.baseRevision) {
      return json({ error: `intent0.manifest.json changed on disk (revision ${onDisk}). Reload to see it before saving.` }, 409);
    }
    const parsed = Manifest.safeParse(body.manifest);
    if (!parsed.success) return json({ error: "The tasks have problems; nothing was saved.", issues: formatIssues(parsed.error) }, 422);
    const manifest = { ...parsed.data, status: "approved" as const, revision: (onDisk ?? parsed.data.revision) + 1 };
    writeManifest(project, manifest);
    log(`  Approved revision ${manifest.revision} (${manifest.flows.filter((f) => f.enabled).length} task(s) on)`);
    return json({ ok: true, revision: manifest.revision });
  }

  /** Quick edits from the website's Dashboard: switch a task on/off or approve its "you may also need" note. */
  function editFlow(body: z.infer<typeof FlowBody>) {
    const { manifest, issues } = loadManifest();
    if (!manifest) return json({ error: issues[0] }, 422);
    const flow = manifest.flows.find((f) => f.id === body.id);
    if (!flow) return json({ error: `No task "${body.id}".` }, 404);
    if (body.enabled !== undefined) flow.enabled = body.enabled;
    if (body.alsoNeedApproved !== undefined && flow.alsoNeed) flow.alsoNeed.approved = body.alsoNeedApproved;
    writeManifest(project, { ...manifest, revision: manifest.revision + 1 });
    return json({ ok: true });
  }

  function approve() {
    const { manifest, issues } = loadManifest();
    if (!manifest) return json({ error: issues[0] }, 422);
    writeManifest(project, { ...manifest, status: "approved", revision: manifest.revision + 1 });
    log(`  Approved revision ${manifest.revision + 1}`);
    return json({ ok: true });
  }

  async function testModel() {
    const env = readEnv(project);
    if (!env.LLM_BASE_URL || !env.LLM_MODEL) return json({ error: "No model is set in .env.local yet." }, 400);
    const model = openAiCompatible({ baseUrl: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY ?? "", model: env.LLM_MODEL });
    const started = Date.now();
    await model.complete('Reply with the JSON object {"ok": true}.', "ping", AbortSignal.timeout(30_000), { maxTokens: 50 });
    return json({ ok: true, ms: Date.now() - started });
  }

  async function reindex() {
    const site = loadManifest().manifest?.site.baseUrl;
    const crawl = site && (await reachable(site)) ? site : undefined;
    const memory = await buildMemory({ root: project.root, crawl, log });
    writeMemory(project, memory);
    return json({ ok: true, crawled: crawl ?? null, site: site ?? null, pages: memory.pages.length, sections: memory.sections.length });
  }

  function setModel(body: z.infer<typeof ModelBody>) {
    writeEnv(project, { LLM_BASE_URL: body.baseUrl, LLM_MODEL: body.model, ...(body.apiKey ? { LLM_API_KEY: body.apiKey } : {}) });
    ensureEnvIgnored(project);
    log(`  Model set to ${body.model}${body.apiKey ? " (new key saved to .env.local)" : ""}`);
    return json({ ok: true, restart: "Restart your site's server (or intent0 serve) so it uses the new model." });
  }

  /** Runs a request through the same understanding step the intent bar uses, with the saved tasks. */
  async function tryRequest(text: string) {
    const { manifest, issues } = loadManifest();
    if (!manifest) return json({ error: issues[0] }, 422);
    const handle = createIntent0Handler({ manifest, memory: loadMemory(), model: modelFromEnv({ ...readEnv(project), ...process.env }) });
    const res = await handle(new Request("http://dashboard.local/intent0/resolve", { method: "POST", body: JSON.stringify({ text }) }), "resolve");
    const result = (await res.json()) as { kind?: string; flowId?: string | null; prefill?: Record<string, unknown>; via?: string; confidence?: number };
    const flow = manifest.flows.find((f) => f.id === result.flowId);
    return json({ ...result, flowTitle: flow?.title ?? null, approved: manifest.status === "approved" });
  }

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(dashboardPage(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        },
      });
    }
    if (!url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    if (!sameToken(request.headers.get("x-intent0-token"), token)) return json({ error: "missing or wrong dashboard token; open the address the CLI printed" }, 401);

    try {
      const route = `${request.method} ${url.pathname}`;
      if (route === "GET /api/state") return json(state());
      const body = await request.json().catch(() => null);
      if (route === "POST /api/manifest") {
        const parsed = SaveBody.safeParse(body);
        return parsed.success ? save(parsed.data) : json({ error: "send {manifest, baseRevision}" }, 400);
      }
      if (route === "POST /api/index") return await reindex();
      if (route === "POST /api/model") {
        const parsed = ModelBody.safeParse(body);
        return parsed.success ? setModel(parsed.data) : json({ error: "Base URL must be a full address and the model can't be empty." }, 400);
      }
      if (route === "POST /api/try") {
        const parsed = TryBody.safeParse(body);
        return parsed.success ? await tryRequest(parsed.data.text) : json({ error: "Type a request first." }, 400);
      }
      if (route === "POST /api/flow") {
        const parsed = FlowBody.safeParse(body);
        return parsed.success ? editFlow(parsed.data) : json({ error: "send {id, enabled?, alsoNeedApproved?}" }, 400);
      }
      if (route === "POST /api/approve") return approve();
      if (route === "POST /api/test-model") return await testModel();
      return json({ error: "not found" }, 404);
    } catch (err) {
      log(`  Error: ${(err as Error).message}`);
      return json({ error: (err as Error).message }, 500);
    }
  };
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

export function startDashboard({ project, port, version, log }: { project: Project; port: number; version: string; log: (s: string) => void }) {
  const token = randomBytes(18).toString("base64url");
  const handle = createDashboardHandler({ project, token, version, log });
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const website = new URL(WEBSITE).origin;

  const server = createServer(async (req, res) => {
    // A page on another site could point a renamed host at 127.0.0.1 (DNS rebinding): only our own host names are answered.
    if (!hosts.has(req.headers.host ?? "")) return void res.writeHead(403).end();
    // Browsers name the calling page: only this dashboard itself and the intent0 website may call.
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    if (origin && !hosts.has(origin.replace(/^https?:\/\//, "")) && origin !== website) return void res.writeHead(403).end();
    const cors: Record<string, string> =
      origin === website
        ? {
            "access-control-allow-origin": website,
            "access-control-allow-headers": "x-intent0-token, content-type",
            "access-control-allow-methods": "GET, POST",
            "access-control-allow-private-network": "true",
            vary: "Origin",
          }
        : {};
    if (req.method === "OPTIONS") return void res.writeHead(204, cors).end();
    const body = req.method === "POST" ? await readBody(req) : undefined;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const response = await handle(
      new Request(`http://${req.headers.host}${req.url ?? "/"}`, { method: req.method, headers, body: body?.length ? new Uint8Array(body) : undefined }),
    );
    res.writeHead(response.status, { ...Object.fromEntries(response.headers), ...cors });
    res.end(Buffer.from(await response.arrayBuffer()));
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    log(err.code === "EADDRINUSE" ? `Port ${port} is already in use (another dashboard?). Try: npx intent0 dashboard --port ${port + 1}` : `Dashboard failed: ${err.message}`);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    log(`\nintent0 dashboard for ${project.name}`);
    log(`  Open: http://127.0.0.1:${port}/?token=${token}`);
    log(`  Or on the intent0 website: ${WEBSITE}/dashboard#api=http://127.0.0.1:${port}&t=${token}`);
    log("  Only this computer can open it, and only with this address. Press Ctrl+C to stop.\n");
  });
  return server;
}
