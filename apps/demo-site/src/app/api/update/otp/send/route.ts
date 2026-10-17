import { fail, ok, parseBody, requireUser } from "@/lib/demo/http";
import { UpdateOtpSendBody } from "@/lib/demo/rules";
import { db, newId } from "@/lib/demo/store";

export async function POST(request: Request) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;
  const body = await parseBody(request, UpdateOtpSendBody);
  if (body.response) return body.response;

  const store = db();
  const enterprise = store.enterprises.get(body.data.reference_number);
  if (!enterprise || enterprise.owner !== auth.user) return fail(404, "No enterprise with this reference on your account.");
  if (enterprise.status !== "active") return fail(409, "This registration is cancelled.");

  const id = newId("otp");
  store.otpRequests.set(id, { id, purpose: "update", subject: enterprise.referenceNumber, verified: false });
  return ok({ otp_request_id: id, message: "OTP sent to the registered mobile number." });
}
