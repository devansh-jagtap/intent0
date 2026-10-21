// intent0's server part for this website. The model key stays here (.env.local).
import { createIntent0Handler, modelFromEnv } from "@intent0/adapter";
import { Manifest, SiteMemory } from "@intent0/schema";
import manifestJson from "../../../../intent0.manifest.json";
import memoryJson from "../../../../intent0.memory.json";

const handle = createIntent0Handler({
  manifest: Manifest.parse(manifestJson),
  memory: SiteMemory.parse(memoryJson),
  model: modelFromEnv(process.env),
});

export async function GET(request: Request, ctx: RouteContext<"/intent0/[action]">) {
  return handle(request, (await ctx.params).action);
}

export async function POST(request: Request, ctx: RouteContext<"/intent0/[action]">) {
  return handle(request, (await ctx.params).action);
}
