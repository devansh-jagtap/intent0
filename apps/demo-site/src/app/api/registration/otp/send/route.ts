import { fail, ok, parseBody } from "@/lib/demo/http";
import { OtpSendBody } from "@/lib/demo/rules";
import { db, newId } from "@/lib/demo/store";

export async function POST(request: Request) {
  const body = await parseBody(request, OtpSendBody);
  if (body.response) return body.response;
  if (body.data.aadhaar_number.startsWith("0")) return fail(422, "This Aadhaar number is not valid.");

  const id = newId("otp");
  db().otpRequests.set(id, {
    id,
    purpose: "registration",
    subject: body.data.aadhaar_number,
    name: body.data.name_on_aadhaar,
    verified: false,
  });
  // A real portal would send an SMS here. The demo OTP is always 123456.
  return ok({ otp_request_id: id, message: "OTP sent to the mobile number linked with Aadhaar." });
}
