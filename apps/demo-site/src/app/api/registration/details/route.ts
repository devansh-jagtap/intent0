import { fail, ok, parseBody } from "@/lib/demo/http";
import { DetailsBody } from "@/lib/demo/rules";
import { db, newId } from "@/lib/demo/store";

export async function POST(request: Request) {
  const body = await parseBody(request, DetailsBody);
  if (body.response) return body.response;

  const store = db();
  const { applicant_token, ...details } = body.data;
  const applicant = store.applicants.get(applicant_token);
  if (!applicant) return fail(401, "Verify your identity with OTP before entering business details.");

  const id = newId("draft");
  store.drafts.set(id, { id, applicantToken: applicant_token, ownerName: applicant.name, details, submitted: false });
  return ok({ draft_id: id });
}
