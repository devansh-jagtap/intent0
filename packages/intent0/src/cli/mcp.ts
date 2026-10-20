import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createMcpServer, createMemoryIndex, httpSiteCall, type MemoryIndex } from "@intent0/core";
import { Manifest, SiteMemory } from "@intent0/schema";

/*
 * `intent0 mcp`: the Model Context Protocol server over stdio, for AI agents such as Claude
 * Desktop or Cursor that start it on the developer's machine. The protocol itself lives in
 * @intent0/core and is shared with the HTTP endpoint (/intent0/mcp) of a running site.
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
  const index: MemoryIndex | null = memory?.success && memory.data.sections.length ? createMemoryIndex(memory.data) : null;
  const base = new URL(site ?? manifest.site.baseUrl).origin;

  const server = createMcpServer({ manifest, index, call: httpSiteCall(base), version });
  log(`${server.tools.length} tool(s) for ${base}: ${server.tools.map((t) => t.name).join(", ") || "none"}`);

  const send = (msg: unknown) => process.stdout.write(`${JSON.stringify(msg)}\n`);
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let msg: unknown;
    try {
      msg = JSON.parse(line);
    } catch {
      return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
    void server.handle(msg).then((reply) => reply && send(reply));
  });
}
