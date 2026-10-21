import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { openAiCompatible } from "@intent0/adapter";
import { Manifest, ModelConfig, SiteMemory, formatIssues } from "@intent0/schema";
import { DASHBOARD_HTML } from "./dashboard-page";
import { buildMemory, topTopics } from "./index-content";
import { detectProject } from "./project";
import { PROVIDERS } from "./providers";
import { MANIFEST_FILE, MEMORY_FILE, readEnv, writeEnv, writeManifest, writeMemory } from "./write";

/**
 * The company's dashboard: a page on this computer only (127.0.0.1) for reviewing what intent0 offers.
 * Every change is written to the same files the CLI uses (intent0.manifest.json, intent0.memory.json,
 * .env.local), so the site picks it up without a restart. The model key can be replaced here but is
 * never sent back to the page.
 */

type Body = Record<string, unknown>;

/** The intent0 website, whose Dashboard page can connect to this command. Override with INTENT0_WEBSITE. */
export const WEBSITE = (process.env.INTENT0_WEBSITE ?? "http://localhost:3200").replace(/\/$/, "");
export class DashboardError extends Error {}

function readManifest(root: string): { manifest: Manifest | null; raw: unknown; issues: string[] } {
  const file = join(root, MANIFEST_FILE);
  if (!existsSync(file)) return { manifest: null, raw: null, issues: [`No ${MANIFEST_FILE} here. Run \`intent0 init\` first.`] };
  const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
  const parsed = Manifest.safeParse(raw);
  return parsed.success ? { manifest: parsed.data, raw, issues: [] } : { manifest: null, raw, issues: formatIssues(parsed.error) };
}

function save(root: string, manifest: Manifest) {
  writeManifest(detectProject(root), { ...manifest, revision: manifest.revision + 1 });
}

function mustRead(root: string): Manifest {
  const { manifest, issues } = readManifest(root);
  if (!manifest) throw new DashboardError(`The manifest has problems; fix them in ${MANIFEST_FILE} first: ${issues.join("; ")}`);
  return manifest;
}

/** Everything the page shows. Never includes the model key. */
export function dashboardState(root: string) {
  const { manifest, raw, issues } = readManifest(root);
  const env = readEnv(detectProject(root));
  const memoryFile = join(root, MEMORY_FILE);
  const memoryParse = existsSync(memoryFile) ? SiteMemory.safeParse(JSON.parse(readFileSync(memoryFile, "utf8"))) : null;
  const memory = memoryParse?.success ? memoryParse.data : null;
  return {
    manifest: manifest ?? raw,
    issues,
    model: {
      provider: manifest?.model.provider ?? null,
      model: env.LLM_MODEL ?? manifest?.model.model ?? null,
      // A preset provider (groq, nvidia…) needs no base URL in the manifest; show the preset's.
      baseUrl: env.LLM_BASE_URL ?? manifest?.model.baseUrl ?? Object.values(PROVIDERS).find((p) => p.provider === manifest?.model.provider)?.baseUrl ?? null,
      keySet: Boolean(env.LLM_API_KEY),
    },
    presets: PROVIDERS,
    memory: memory
      ? { pages: memory.pages.length, sections: memory.sections.length, builtAt: memory.builtAt, topics: topTopics(memory), list: memory.pages.map((p) => ({ title: p.title, url: p.url })) }
      : null,
  };
}

/** One change from the dashboard. Pure file work, so it can be tested without a server. */
export async function dashboardAction(root: string, action: string, body: Body, log: (s: string) => void = () => {}) {
  switch (action) {
    case "flow": {
      const manifest = mustRead(root);
      const flow = manifest.flows.find((f) => f.id === body.id);
      if (!flow) throw new DashboardError(`No task "${String(body.id)}".`);
      if (typeof body.enabled === "boolean") flow.enabled = body.enabled;
      if (typeof body.alsoNeedApproved === "boolean" && flow.alsoNeed) flow.alsoNeed.approved = body.alsoNeedApproved;
      save(root, manifest);
      return { ok: true };
    }
    case "approve": {
      const manifest = mustRead(root);
      save(root, { ...manifest, status: "approved" });
      return { ok: true };
    }
    case "model": {
      const manifest = mustRead(root);
      const preset = PROVIDERS[String(body.provider)] ?? PROVIDERS.custom!;
      const baseUrl = String(body.baseUrl || preset.baseUrl).trim();
      const model = String(body.model || preset.model).trim();
      const config = ModelConfig.safeParse({ provider: preset.provider, model, ...(preset.provider === "openai_compatible" ? { baseUrl } : {}) });
      if (!config.success || !/^https?:\/\//.test(baseUrl)) throw new DashboardError("Choose a provider, a model name and a valid base URL.");
      const project = detectProject(root);
      const env: Record<string, string> = { LLM_BASE_URL: baseUrl, LLM_MODEL: model };
      if (typeof body.apiKey === "string" && body.apiKey.trim()) env.LLM_API_KEY = body.apiKey.trim();
      writeEnv(project, env);
      save(root, { ...manifest, model: config.data });
      return { ok: true, restart: "Restart your site's server (or intent0 serve) so it uses the new model." };
    }
    case "test-model": {
      const env = readEnv(detectProject(root));
      if (!env.LLM_BASE_URL || !env.LLM_MODEL) throw new DashboardError("No model is set in .env.local yet.");
      const model = openAiCompatible({ baseUrl: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY ?? "", model: env.LLM_MODEL });
      const started = Date.now();
      await model.complete('Reply with the JSON object {"ok": true}.', "ping", AbortSignal.timeout(30_000), { maxTokens: 50 });
      return { ok: true, ms: Date.now() - started };
    }
    case "index": {
      const manifest = mustRead(root);
      const site = new URL(manifest.site.baseUrl).origin;
      const up = await fetch(site, { signal: AbortSignal.timeout(4_000) }).then((r) => r.status < 500, () => false);
      const memory = await buildMemory({ root, crawl: up ? site : undefined, log });
      writeMemory(detectProject(root), memory);
      return { ok: true, crawled: up, site, pages: memory.pages.length, sections: memory.sections.length };
    }
    default:
      throw new DashboardError(`Unknown action "${action}".`);
  }
}

async function readJson(req: IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as Body) : {};
}

export function startDashboard({ root, port, log }: { root: string; port: number; log: (s: string) => void }) {
  // A random token in the address: other websites open in the same browser can't call this server.
  const token = randomBytes(16).toString("hex");
  const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);

  const sites = new Set([new URL(WEBSITE).origin]);

  const send = (res: ServerResponse, status: number, data: unknown, type = "application/json", origin?: string) => {
    const headers: Record<string, string> = { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store", "x-frame-options": "DENY", vary: "Origin" };
    // The intent0 website's Dashboard page talks to this server from the browser (still needs the token).
    if (origin && sites.has(origin)) {
      headers["access-control-allow-origin"] = origin;
      headers["access-control-allow-headers"] = "x-intent0-token, content-type";
      headers["access-control-allow-methods"] = "GET, POST";
      headers["access-control-allow-private-network"] = "true";
    }
    res.writeHead(status, headers);
    res.end(type === "application/json" ? JSON.stringify(data) : String(data));
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    // Only this computer, by name (guards against DNS rebinding), and only with the token.
    if (!hosts.has(req.headers.host ?? "")) return send(res, 403, { error: "forbidden" });
    if (origin && !hosts.has(origin.replace(/^https?:\/\//, "")) && !sites.has(origin)) return send(res, 403, { error: "forbidden" });
    if (req.method === "OPTIONS") return send(res, 204, "", "text/plain", origin);
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, DASHBOARD_HTML, "text/html");
    if (!url.pathname.startsWith("/api/")) return send(res, 404, { error: "not found" });
    if (req.headers["x-intent0-token"] !== token) return send(res, 401, { error: "Open the dashboard from the link the CLI printed." }, "application/json", origin);
    const reply = (status: number, data: unknown) => send(res, status, data, "application/json", origin);

    try {
      const action = url.pathname.slice("/api/".length);
      if (req.method === "GET" && action === "state") return reply(200, dashboardState(root));
      if (req.method !== "POST") return reply(405, { error: "method not allowed" });
      const result = await dashboardAction(root, action, await readJson(req), (s) => log(`  ${s.trim()}`));
      log(`  ${action}: done`);
      return reply(200, result);
    } catch (err) {
      const message = err instanceof DashboardError ? err.message : `Failed: ${(err as Error).message}`;
      return reply(err instanceof DashboardError ? 400 : 500, { error: message });
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    log(err.code === "EADDRINUSE" ? `Port ${port} is already in use (another dashboard?). Try: npx intent0 dashboard --port ${port + 1}` : `Dashboard failed: ${err.message}`);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    log(`\nintent0 dashboard for ${root}`);
    log(`  Open: ${WEBSITE}/dashboard#api=http://localhost:${port}&t=${token}`);
    log(`  Or without the website: http://localhost:${port}/#${token}`);
    log("  Only reachable from this computer. Press Ctrl+C to stop.\n");
  });
  return server;
}
