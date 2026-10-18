import { flowTool, runFlowForAgent, searchTool, type AgentTool, type SiteCall } from "@intent0/core";
import type { Manifest } from "@intent0/schema";

/*
 * WebMCP: lets AI agents in the visitor's browser use this site's approved tasks and search
 * as tools, in the visitor's own session (navigator.modelContext, a W3C draft that Chrome is
 * previewing). If the browser doesn't support it, nothing happens.
 */

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };
type BrowserTool = AgentTool & { execute: (input: Record<string, unknown>) => Promise<ToolResult> };
interface ModelContext {
  registerTool?: (tool: BrowserTool) => { unregister?: () => void } | void;
  unregisterTool?: (name: string) => void;
  provideContext?: (ctx: { tools: BrowserTool[] }) => void;
}

const text = (value: unknown, isError = false): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }], ...(isError ? { isError } : {}) });

export function registerBrowserTools(manifest: Manifest, endpoint: string, hasContent: boolean, call: SiteCall): () => void {
  const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  if (!mc || (!mc.registerTool && !mc.provideContext)) return () => {};

  const tools: BrowserTool[] = manifest.flows.map((flow) => ({
    ...flowTool(flow),
    execute: async (input) => {
      const result = await runFlowForAgent(manifest, flow.id, input ?? {}, call);
      return text(result, result.status === "rejected");
    },
  }));
  if (hasContent) {
    tools.push({
      ...searchTool,
      execute: async (input) => {
        const res = await fetch(`${endpoint}/search`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: String(input?.query ?? "") }) });
        return text(await res.json(), !res.ok);
      },
    });
  }

  try {
    if (mc.registerTool) {
      const handles = tools.map((t) => mc.registerTool!(t));
      return () =>
        handles.forEach((h, i) => {
          try {
            if (h && typeof h.unregister === "function") h.unregister();
            else mc.unregisterTool?.(tools[i]!.name);
          } catch {
            /* already gone */
          }
        });
    }
    mc.provideContext!({ tools });
    return () => mc.provideContext?.({ tools: [] });
  } catch (err) {
    console.warn("[intent0] couldn't register WebMCP tools:", (err as Error).message);
    return () => {};
  }
}
