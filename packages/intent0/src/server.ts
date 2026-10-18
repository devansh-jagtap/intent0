import { createIntent0Handler, modelFromEnv } from "@intent0/adapter";
import { Manifest, SiteMemory, formatIssues } from "@intent0/schema";

type RouteContext = { params: Promise<{ action: string }> };

/**
 * Next.js App Router handlers for app/intent0/[action]/route.ts.
 * The model key is read from the server environment (LLM_API_KEY) and never reaches the browser.
 * Only an approved manifest is served; a draft shows nothing.
 * With Site Memory (intent0.memory.json) the bar can also answer with information pages.
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
  });
  const route = async (request: Request, ctx: RouteContext) => handle(request, (await ctx.params).action);
  return { GET: route, POST: route };
}
