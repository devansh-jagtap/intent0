import { fail, ok, parseBody } from "@/lib/demo/http";
import { OtpVerifyBody } from "@/lib/demo/rules";
import { DEMO_OTP, db, newId } from "@/lib/demo/store";

export async function POST(request: Request) {
  const body = await parseBody(request, OtpVerifyBody);
  if (body.response) return body.response;

  const store = db();
  const req = store.otpRequests.get(body.data.otp_request_id);
  if (!req || req.purpose !== "registration") return fail(404, "OTP request not found. Request a new OTP.");
  if (req.verified) return fail(409, "This OTP has already been used. Request a new OTP.");
  if (body.data.otp !== DEMO_OTP) return fail(400, "The OTP is incorrect.", { otp: ["The OTP is incorrect."] });

  req.verified = true;
  const token = newId("applicant");
  store.applicants.set(token, { token, aadhaarNumber: req.subject, name: req.name ?? "" });
  return ok({ applicant_token: token });
}
