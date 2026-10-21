import type { Manifest } from "@intent0/schema";
import { flowTool, runFlowForAgent, searchForAgent, searchTool, type AgentTool, type SiteCall } from "./agent";
import type { MemoryIndex } from "./search";

/*
 * The Model Context Protocol (JSON-RPC) for AI agents, shared by `intent0 mcp` (stdio, on the
 * company's computer) and the website's own /intent0/mcp endpoint (HTTP, for any agent online).
 * Offers only PUBLIC, approved, switched-on tasks plus search over Site Memory. Tasks that need
 * a signed-in person stay in the browser, because an outside agent has no user session.
 */

export type JsonRpcMessage = { jsonrpc: "2.0"; id?: number | string | null; method?: string; params?: Record<string, unknown> };
export type JsonRpcReply = { jsonrpc: "2.0"; id: number | string | null; result?: unknown; error?: { code: number; message: string } };

export interface McpOptions {
  manifest: Manifest;
  index: MemoryIndex | null;
  /** Calls the site's own endpoints. */
  call: SiteCall;
  version: string;
}

/** Calls the website's own endpoints over HTTP, as an anonymous visitor (no cookies). */
export function httpSiteCall(base: string, userAgent = "intent0-agent"): SiteCall {
  return async (method, path, body) => {
    const url = new URL(path, base);
    let res: Response;
    if (method === "GET") {
      for (const [k, v] of Object.entries(body)) url.searchParams.set(k, String(v));
      res = await fetch(url, { headers: { "user-agent": userAgent } });
    } else {
      res = await fetch(url, { method, headers: { "content-type": "application/json", "user-agent": userAgent }, body: JSON.stringify(body) });
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  };
}

/** The tasks agents may use: approved manifest, switched on, no sign-in needed. */
export function agentFlows(manifest: Manifest) {
  return manifest.status === "approved" ? manifest.flows.filter((f) => f.enabled && f.auth === "public") : [];
}

export function createMcpServer({ manifest, index, call, version }: McpOptions) {
  const flows = agentFlows(manifest);
  const tools: AgentTool[] = [...flows.map(flowTool), ...(index ? [searchTool] : [])];
  const text = (value: unknown, isError = false) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }], isError });
  const reply = (id: JsonRpcReply["id"], result: unknown): JsonRpcReply => ({ jsonrpc: "2.0", id, result });

  /** Handles one message. Notifications (no id) get no reply: null. */
  async function handle(msg: JsonRpcMessage): Promise<JsonRpcReply | null> {
    const { id, method, params = {} } = msg;
    if (id === undefined || id === null) return null;
    switch (method) {
      case "initialize":
        return reply(id, {
          protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: `intent0 (${manifest.site.name})`, version },
          instructions: `Tools for ${manifest.site.name}. Use search_site for questions about the site; use the task tools to act. Never submit an irreversible task without the person's explicit confirmation.`,
        });
      case "ping":
        return reply(id, {});
      case "tools/list":
        return reply(id, { tools });
      case "tools/call": {
        const name = String(params.name ?? "");
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        try {
          if (name === "search_site" && index) return reply(id, text({ results: searchForAgent(index, String(args.query ?? "")) }));
          if (!flows.some((f) => f.id === name)) return reply(id, text({ error: `Unknown tool ${name}` }, true));
          const result = await runFlowForAgent(manifest, name, args, call);
          return reply(id, text(result, result.status === "rejected"));
        } catch (err) {
          return reply(id, text({ error: (err as Error).message }, true));
        }
      }
      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
  }

  return { tools, handle };
}
