// Every docs page as plain text, for AI agents.
import { handleIntent0 } from "@/lib/intent0";

export function GET(request: Request) {
  return handleIntent0(request, "llms-full.txt");
}
