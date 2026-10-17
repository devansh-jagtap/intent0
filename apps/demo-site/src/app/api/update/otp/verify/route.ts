import { fail, ok, parseBody, requireUser } from "@/lib/demo/http";
import { UpdateOtpVerifyBody } from "@/lib/demo/rules";
import { DEMO_OTP, db, newId } from "@/lib/demo/store";

export async function POST(request: Request) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;
  const body = await parseBody(request, UpdateOtpVerifyBody);
  if (body.response) return body.response;

  const store = db();
  const req = store.otpRequests.get(body.data.otp_request_id);
  if (!req || req.purpose !== "update") return fail(404, "OTP request not found. Request a new OTP.");
  if (req.verified) return fail(409, "This OTP has already been used. Request a new OTP.");
  if (body.data.update_otp !== DEMO_OTP) {
    return fail(400, "The OTP is incorrect.", { update_otp: ["The OTP is incorrect."] });
  }

  req.verified = true;
  const token = newId("update");
  store.updateGrants.set(token, { token, referenceNumber: req.subject, used: false });
  return ok({ update_token: token });
}
