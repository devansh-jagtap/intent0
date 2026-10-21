import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createMcpServer, createMemoryIndex, httpSiteCall, type JsonRpcMessage } from "@intent0/core";
import { Manifest, SiteMemory } from "@intent0/schema";

/*
 * `intent0 mcp`: the Model Context Protocol over stdio, for AI agents on the company's own
 * computer (Claude Desktop, Cursor). Same tools and rules as the website's /intent0/mcp endpoint:
 * public approved tasks and search over Site Memory, calling the site's own endpoints over HTTP.
 */

interface McpOptions {
  manifestFile: string;
  memoryFile: string;
  /** Where the website runs; defaults to the manifest's site URL. */
  site?: string;
  version: string;
}

export function startMcp({ manifestFile, memoryFile, site, version }: McpOptions) {
  // stdout carries protocol messages only; everything else goes to stderr.
  const log = (s: string) => process.stderr.write(`[intent0 mcp] ${s}\n`);
  const manifest = Manifest.parse(JSON.parse(readFileSync(manifestFile, "utf8")));
  const memory = existsSync(memoryFile) ? SiteMemory.safeParse(JSON.parse(readFileSync(memoryFile, "utf8"))) : null;
  const index = memory?.success && memory.data.sections.length ? createMemoryIndex(memory.data) : null;
  const base = new URL(site ?? manifest.site.baseUrl).origin;

  const server = createMcpServer({ manifest, index, call: httpSiteCall(base, "intent0-mcp"), version });
  log(`${server.tools.length} tool(s) for ${base}: ${server.tools.map((t) => t.name).join(", ")}`);
  const send = (msg: Record<string, unknown>) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...msg })}\n`);

  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(line) as JsonRpcMessage;
    } catch {
      return send({ id: null, error: { code: -32700, message: "Parse error" } });
    }
    void server.handle(msg).then((reply) => reply && send(reply));
  });
}
