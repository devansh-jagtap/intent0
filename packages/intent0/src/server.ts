import { createIntent0Handler, modelFromEnv } from "@intent0/adapter";
import { Manifest } from "@intent0/schema";

type RouteContext = { params: Promise<{ action: string }> };

/**
 * Next.js App Router handlers for app/intent0/[action]/route.ts.
 * The model key is read from the server environment (LLM_API_KEY) and never reaches the browser.
 * Only an approved manifest is served; a draft shows nothing.
 */
export function createNextRoute(manifestJson: unknown): {
  GET: (request: Request, ctx: RouteContext) => Promise<Response>;
  POST: (request: Request, ctx: RouteContext) => Promise<Response>;
} {
  const handle = createIntent0Handler({
    manifest: Manifest.parse(manifestJson),
    model: modelFromEnv(process.env),
  });
  const route = async (request: Request, ctx: RouteContext) => handle(request, (await ctx.params).action);
  return { GET: route, POST: route };
}
