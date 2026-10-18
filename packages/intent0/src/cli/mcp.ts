import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createMemoryIndex, flowTool, runFlowForAgent, searchForAgent, searchTool, type AgentTool, type MemoryIndex, type SiteCall } from "@intent0/core";
import { Manifest, SiteMemory } from "@intent0/schema";

/*
 * `intent0 mcp`: a Model Context Protocol server (stdio) for AI agents such as Claude Desktop
 * or Cursor. It offers the site's PUBLIC approved tasks and a search over Site Memory, and
 * calls the site's own endpoints over HTTP. Tasks that need a signed-in person stay in the
 * browser (WebMCP), because an outside agent has no user session.
 */

interface McpOptions {
  manifestFile: string;
  memoryFile: string;
  /** Where the website runs; defaults to the manifest's site URL. */
  site?: string;
  version: string;
}

type JsonRpc = { jsonrpc: "2.0"; id?: number | string; method?: string; params?: Record<string, unknown> };

export function startMcp({ manifestFile, memoryFile, site, version }: McpOptions) {
  // stdout carries protocol messages only; everything else goes to stderr.
  const log = (s: string) => process.stderr.write(`[intent0 mcp] ${s}\n`);
  const manifest = Manifest.parse(JSON.parse(readFileSync(manifestFile, "utf8")));
  const memory = existsSync(memoryFile) ? SiteMemory.safeParse(JSON.parse(readFileSync(memoryFile, "utf8"))) : null;
  const index: MemoryIndex | null = memory?.success && memory.data.sections.length ? createMemoryIndex(memory.data) : null;
  const base = new URL(site ?? manifest.site.baseUrl).origin;

  const flows = manifest.status === "approved" ? manifest.flows.filter((f) => f.enabled && f.auth === "public") : [];
  const tools: AgentTool[] = [...flows.map(flowTool), ...(index ? [searchTool] : [])];
  log(`${flows.length} task tool(s)${index ? " + search_site" : ""} for ${base}`);

  const call: SiteCall = async (method, path, body) => {
    const url = new URL(path, base);
    let res: Response;
    if (method === "GET") {
      for (const [k, v] of Object.entries(body)) url.searchParams.set(k, String(v));
      res = await fetch(url, { headers: { "user-agent": "intent0-mcp" } });
    } else {
      res = await fetch(url, { method, headers: { "content-type": "application/json", "user-agent": "intent0-mcp" }, body: JSON.stringify(body) });
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  };

  const send = (msg: Record<string, unknown>) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...msg })}\n`);
  const text = (value: unknown, isError = false) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }], isError });

  async function handle(msg: JsonRpc) {
    const { id, method, params = {} } = msg;
    if (id === undefined) return; // notifications (e.g. notifications/initialized) need no reply
    switch (method) {
      case "initialize":
        return send({
          id,
          result: {
            protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-06-18",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: `intent0 (${manifest.site.name})`, version },
            instructions: `Tools for ${manifest.site.name}. Use search_site for questions about the site; use the task tools to act. Never submit an irreversible task without the person's explicit confirmation.`,
          },
        });
      case "ping":
        return send({ id, result: {} });
      case "tools/list":
        return send({ id, result: { tools } });
      case "tools/call": {
        const name = String(params.name ?? "");
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        try {
          if (name === "search_site" && index) return send({ id, result: text({ results: searchForAgent(index, String(args.query ?? "")) }) });
          if (!flows.some((f) => f.id === name)) return send({ id, result: text({ error: `Unknown tool ${name}` }, true) });
          const result = await runFlowForAgent(manifest, name, args, call);
          return send({ id, result: text(result, result.status === "rejected") });
        } catch (err) {
          return send({ id, result: text({ error: (err as Error).message }, true) });
        }
      }
      default:
        return send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  }

  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let msg: JsonRpc;
    try {
      msg = JSON.parse(line) as JsonRpc;
    } catch {
      return send({ id: null, error: { code: -32700, message: "Parse error" } });
    }
    void handle(msg);
  });
}
