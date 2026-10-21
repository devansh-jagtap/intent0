import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createIntent0Handler, modelFromEnv } from "@intent0/adapter";
import { Manifest, SiteMemory } from "@intent0/schema";

function envFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

export interface ServeOptions {
  root: string;
  manifestFile: string;
  port: number;
  /** Extra website origins allowed to use this server (the manifest's site URL is always allowed). */
  origins: string[];
  log: (s: string) => void;
}

/**
 * The intent0 server for websites that aren't Next.js: serves intent0.js and the
 * /intent0/* endpoints, holds the model key, and only answers the site's own origin(s).
 */
export function serve({ root, manifestFile, port, origins, log }: ServeOptions) {
  const env = { ...envFile(join(root, ".env")), ...envFile(join(root, ".env.local")), ...process.env };
  const model = modelFromEnv(env);
  const scriptFile = join(dirname(fileURLToPath(import.meta.url)), "intent0.js");

  // Reload the manifest and Site Memory whenever either file changes (e.g. after `intent0 approve` / `intent0 index`).
  const memoryFile = join(dirname(manifestFile), "intent0.memory.json");
  const mtimeOf = (f: string) => (existsSync(f) ? statSync(f).mtimeMs : 0);
  let loaded = { mtime: "", handle: null as ReturnType<typeof createIntent0Handler> | null, allowed: new Set<string>() };
  function current() {
    const mtime = `${mtimeOf(manifestFile)}:${mtimeOf(memoryFile)}`;
    if (mtime !== loaded.mtime) {
      const manifest = Manifest.parse(JSON.parse(readFileSync(manifestFile, "utf8")));
      const memoryParse = existsSync(memoryFile) ? SiteMemory.safeParse(JSON.parse(readFileSync(memoryFile, "utf8"))) : null;
      if (memoryParse && !memoryParse.success) log("  intent0.memory.json is invalid; information pages are off until you run `intent0 index` again.");
      const memory = memoryParse?.success ? memoryParse.data : null;
      loaded = {
        mtime,
        handle: createIntent0Handler({ manifest, memory, model, siteUrl: manifest.site.baseUrl }),
        allowed: new Set([new URL(manifest.site.baseUrl).origin, ...origins]),
      };
      log(
        `  Loaded ${manifest.flows.filter((f) => f.enabled).length} task(s), status: ${manifest.status}` +
          (memory ? `; Site Memory: ${memory.pages.length} page(s), ${memory.sections.length} section(s)` : ""),
      );
    }
    return loaded;
  }
  const first = current();

  const server = createServer(async (req, res) => {
    try {
      const { handle, allowed } = current();
      const origin = req.headers.origin;
      const corsOk = Boolean(origin && allowed.has(origin));
      if (corsOk) {
        res.setHeader("access-control-allow-origin", origin!);
        res.setHeader("vary", "origin");
        res.setHeader("access-control-allow-headers", "content-type");
        res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      }
      if (req.method === "OPTIONS") return void res.writeHead(corsOk ? 204 : 403).end();

      const url = new URL(req.url ?? "/", "http://intent0.local");
      if (url.pathname === "/intent0.js") {
        res.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-cache" });
        return void res.end(readFileSync(scriptFile));
      }

      // /llms.txt and /llms-full.txt are also served at the root, for agents that look there.
      const action = /^\/(?:intent0\/)?(llms(?:-full)?\.txt)$/.exec(url.pathname)?.[1] ?? /^\/intent0\/(\w+)$/.exec(url.pathname)?.[1];
      if (!action || !handle) return void res.writeHead(404).end();
      if (origin && !corsOk) {
        res.writeHead(403, { "content-type": "application/json" });
        return void res.end(JSON.stringify({ error: `Website ${origin} isn't allowed. Restart with --origin ${origin}` }));
      }

      const body = req.method === "POST" ? await readBody(req) : undefined;
      const response = await handle(
        new Request(`http://${req.headers.host ?? `localhost:${port}`}${url.pathname}`, {
          method: req.method,
          headers: { "content-type": req.headers["content-type"] ?? "application/json", "x-forwarded-for": req.socket.remoteAddress ?? "" },
          body: body && body.length > 0 ? new Uint8Array(body) : undefined,
        }),
        action,
      );
      res.writeHead(response.status, { "content-type": response.headers.get("content-type") ?? "application/json" });
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      log(`  Error: ${(err as Error).message}`);
      if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "intent0 server error" }));
    }
  });

  server.listen(port, () => {
    log(`\nintent0 server running on http://localhost:${port}`);
    log(`  Model: ${model ? model.name : "none configured (mock mode: keyword matching + simple pages)"}`);
    log(`  Allowed website(s): ${[...first.allowed].join(", ")}`);
    log(`\n  Add this to your website's pages, just before </body>:`);
    log(`    <script src="http://localhost:${port}/intent0.js" defer></script>\n`);
  });
  return server;
}
