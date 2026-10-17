import { fail, ok, parseBody, sessionUser } from "@/lib/demo/http";
import { SubmitBody } from "@/lib/demo/rules";
import { DEMO_OTP, DEMO_USER, db, nextReferenceNumber } from "@/lib/demo/store";

export async function POST(request: Request) {
  const body = await parseBody(request, SubmitBody);
  if (body.response) return body.response;

  const store = db();
  const draft = store.drafts.get(body.data.draft_id);
  if (!draft) return fail(404, "Application draft not found.");
  if (draft.submitted) return fail(409, "This application has already been submitted.");
  if (body.data.final_otp !== DEMO_OTP) {
    return fail(400, "The OTP is incorrect.", { final_otp: ["The OTP is incorrect."] });
  }

  draft.submitted = true;
  const referenceNumber = nextReferenceNumber();
  store.enterprises.set(referenceNumber, {
    referenceNumber,
    // Registration is public; in the demo every new enterprise belongs to the demo account
    // so it can be updated and printed after signing in.
    owner: sessionUser(request) ?? DEMO_USER,
    ownerName: draft.ownerName,
    details: draft.details,
    address: "Not provided",
    mobile: "Not provided",
    status: "active",
    certificateId: `CERT-${referenceNumber.slice(-6)}`,
    registeredAt: new Date().toISOString().slice(0, 10),
  });
  return ok({ reference_number: referenceNumber });
}
