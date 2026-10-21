import { createIntent0Handler, modelFromEnv } from "@intent0/adapter";
import { Manifest, SiteMemory, formatIssues } from "@intent0/schema";

type RouteContext = { params: Promise<{ action: string }> };

/**
 * Next.js App Router handlers for app/intent0/[action]/route.ts.
 * The model key is read from the server environment (LLM_API_KEY) and never reaches the browser.
 * Only an approved manifest is served; a draft shows nothing.
 * With Site Memory (intent0.memory.json) the bar can also answer with information pages.
 * /intent0/mcp serves the site's public approved tasks to AI agents (MCP over HTTP).
 */
export function createNextRoute(
  manifestJson: unknown,
  memoryJson?: unknown,
): {
  GET: (request: Request, ctx: RouteContext) => Promise<Response>;
  POST: (request: Request, ctx: RouteContext) => Promise<Response>;
} {
  let memory: SiteMemory | null = null;
  if (memoryJson) {
    const parsed = SiteMemory.safeParse(memoryJson);
    if (parsed.success) memory = parsed.data;
    else console.warn(`[intent0] ignoring intent0.memory.json: ${formatIssues(parsed.error).slice(0, 3).join("; ")}`);
  }
  const handle = createIntent0Handler({
    manifest: Manifest.parse(manifestJson),
    memory,
    model: modelFromEnv(process.env),
    // Where agents' task calls (/intent0/mcp) go once the site is deployed.
    siteUrl: process.env.INTENT0_SITE_URL,
  });
  const route = async (request: Request, ctx: RouteContext) => handle(request, (await ctx.params).action);
  return { GET: route, POST: route };
}

/**
 * app/llms.txt/route.ts and app/llms-full.txt/route.ts: the machine version of the site for AI
 * agents and crawlers, built from the approved manifest and Site Memory.
 */
export function createMachineRoute(manifestJson: unknown, memoryJson: unknown, file: "llms.txt" | "llms-full.txt"): { GET: (request: Request) => Promise<Response> } {
  const { GET } = createNextRoute(manifestJson, memoryJson);
  return { GET: (request: Request) => GET(request, { params: Promise.resolve({ action: file }) }) };
}
