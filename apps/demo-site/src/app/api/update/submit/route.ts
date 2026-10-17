import { fail, ok, parseBody, requireUser } from "@/lib/demo/http";
import { UpdateSubmitBody } from "@/lib/demo/rules";
import { db, newId } from "@/lib/demo/store";

export async function POST(request: Request) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;
  const body = await parseBody(request, UpdateSubmitBody);
  if (body.response) return body.response;

  const store = db();
  const grant = store.updateGrants.get(body.data.update_token);
  if (!grant || grant.used) return fail(401, "Confirm it's you with an OTP before updating details.");
  const enterprise = store.enterprises.get(grant.referenceNumber);
  if (!enterprise || enterprise.owner !== auth.user) return fail(404, "Enterprise not found on your account.");

  grant.used = true;
  if (body.data.new_address) enterprise.address = body.data.new_address;
  if (body.data.new_mobile) enterprise.mobile = body.data.new_mobile;
  // The demo doesn't store the uploaded proof; a real portal would.
  return ok({ update_request_id: newId("upd") });
}
