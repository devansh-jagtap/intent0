import { fail, ok, parseBody, requireUser } from "@/lib/demo/http";
import { CancelBody } from "@/lib/demo/rules";
import { db, newId } from "@/lib/demo/store";

export async function POST(request: Request) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;
  const body = await parseBody(request, CancelBody);
  if (body.response) return body.response;

  const enterprise = db().enterprises.get(body.data.cancel_reference);
  if (!enterprise || enterprise.owner !== auth.user) return fail(404, "No enterprise with this reference on your account.");
  if (enterprise.status === "cancelled") return fail(409, "This registration is already cancelled.");

  enterprise.status = "cancelled";
  return ok({ cancellation_id: newId("cancel") });
}
