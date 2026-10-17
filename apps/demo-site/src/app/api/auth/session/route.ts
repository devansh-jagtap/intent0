import { ok, sessionUser } from "@/lib/demo/http";

export async function GET(request: Request) {
  return ok({ user: sessionUser(request) });
}
