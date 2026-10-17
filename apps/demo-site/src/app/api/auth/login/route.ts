import { SESSION_COOKIE, ok } from "@/lib/demo/http";
import { db, newId } from "@/lib/demo/store";

/** Mock sign-in: anyone who clicks "Sign in" becomes the demo user. No passwords in this demo. */
export async function POST() {
  const token = newId("session");
  db().sessions.add(token);
  return ok(
    { user: "demo" },
    { headers: { "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax` } },
  );
}
