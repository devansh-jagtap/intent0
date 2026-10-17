import { SESSION_COOKIE, ok } from "@/lib/demo/http";
import { db } from "@/lib/demo/store";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (token) db().sessions.delete(decodeURIComponent(token));
  return ok({ user: null }, { headers: { "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` } });
}
