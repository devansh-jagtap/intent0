// The machine version of this website for AI agents (llms.txt format): pages, tasks and how to connect.
import { handleIntent0 } from "@/lib/intent0";

export function GET(request: Request) {
  return handleIntent0(request, "llms.txt");
}
