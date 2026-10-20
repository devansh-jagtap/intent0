import type { Manifest } from "@intent0/schema";
import { flowTool, runFlowForAgent, searchForAgent, searchTool, type AgentTool, type SiteCall } from "./agent";
import type { MemoryIndex } from "./search";

/*
 * The Model Context Protocol (JSON-RPC 2.0) side of intent0, independent of the transport.
 * `intent0 mcp` uses it over stdio (Claude Desktop, Cursor…); the adapter uses it over HTTP
 * at /intent0/mcp so agents can reach a deployed site. Both offer exactly the same tools:
 * the site's PUBLIC approved tasks and search_site. Tasks that need a signed-in person stay
 * in the browser (WebMCP), because an outside agent has no user session.
 */

export const MCP_PROTOCOL_VERSION = "2025-06-18";

export type JsonRpcId = number | string | null;
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}
export type JsonRpcResponse = { jsonrpc: "2.0"; id: JsonRpcId } & ({ result: unknown } | { error: { code: number; message: string } });

export interface McpServerOptions {
  manifest: Manifest;
  index: MemoryIndex | null;
  /** Calls the website's own endpoints. */
  call: SiteCall;
  version: string;
}

export interface McpServer {
  tools: AgentTool[];
  /** Returns the reply, or null for notifications (which get none). */
  handle(message: unknown): Promise<JsonRpcResponse | null>;
}

/** Only approved, enabled, public tasks: agents get what an anonymous visitor gets. */
export function agentFlows(manifest: Manifest) {
  return manifest.status === "approved" ? manifest.flows.filter((f) => f.enabled && f.auth === "public") : [];
}

export function createMcpServer({ manifest, index, call, version }: McpServerOptions): McpServer {
  const flows = agentFlows(manifest);
  const tools: AgentTool[] = [...flows.map(flowTool), ...(index ? [searchTool] : [])];

  const reply = (id: JsonRpcId, result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });
  const fail = (id: JsonRpcId, code: number, message: string): JsonRpcResponse => ({ jsonrpc: "2.0", id, error: { code, message } });
  const text = (value: unknown, isError = false) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }], isError });

  async function handle(message: unknown): Promise<JsonRpcResponse | null> {
    if (!message || typeof message !== "object" || Array.isArray(message)) return fail(null, -32600, "Invalid request");
    const { id, method, params = {} } = message as JsonRpcRequest;
    if (id === undefined) return null; // notifications (e.g. notifications/initialized) need no reply
    switch (method) {
      case "initialize":
        return reply(id, {
          protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : MCP_PROTOCOL_VERSION,
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
        return fail(id, -32601, `Method not found: ${method}`);
    }
  }

  return { tools, handle };
}

/** A SiteCall that reaches the website's endpoints over HTTP, from a server (not a browser). */
export function httpSiteCall(origin: string, userAgent = "intent0-mcp"): SiteCall {
  return async (method, path, body) => {
    const url = new URL(path, origin);
    // Never let a manifest path point the server at another host.
    if (url.origin !== new URL(origin).origin) return { ok: false, status: 400, data: { error: "path leaves the website" } };
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
