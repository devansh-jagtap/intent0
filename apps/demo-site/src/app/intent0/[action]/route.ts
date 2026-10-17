// intent0 adapter, mounted by the website. The CLI will generate this file later.
import { createIntent0Handler, modelFromEnv } from "@intent0/adapter";
import { Manifest } from "@intent0/schema";
import manifestJson from "../../../../../../examples/enterprise-portal.manifest.json";

const handle = createIntent0Handler({
  manifest: Manifest.parse(manifestJson),
  // Key stays on this server: read from .env.local, never sent to the browser.
  model: modelFromEnv(process.env),
});

export async function GET(request: Request, ctx: RouteContext<"/intent0/[action]">) {
  return handle(request, (await ctx.params).action);
}

export async function POST(request: Request, ctx: RouteContext<"/intent0/[action]">) {
  return handle(request, (await ctx.params).action);
}
