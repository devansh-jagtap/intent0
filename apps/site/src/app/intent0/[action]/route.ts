// intent0's server part for this website: the Ask button, search, and MCP for AI agents.
import { handleIntent0 } from "@/lib/intent0";

export async function GET(request: Request, ctx: RouteContext<"/intent0/[action]">) {
  return handleIntent0(request, (await ctx.params).action);
}

export async function POST(request: Request, ctx: RouteContext<"/intent0/[action]">) {
  return handleIntent0(request, (await ctx.params).action);
}
