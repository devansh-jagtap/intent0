import { fail, ok, requireUser } from "@/lib/demo/http";
import { db } from "@/lib/demo/store";

export async function GET(request: Request) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  const reference = new URL(request.url).searchParams.get("certificate_reference")?.trim();
  if (!reference) {
    return fail(422, "Some fields are invalid.", { certificate_reference: ["Registration reference is required"] });
  }
  const enterprise = db().enterprises.get(reference);
  if (!enterprise || enterprise.owner !== auth.user) return fail(404, "No enterprise with this reference on your account.");

  return ok({
    certificate_id: enterprise.certificateId,
    reference_number: enterprise.referenceNumber,
    business_name: enterprise.details.business_name,
    business_type: enterprise.details.business_type,
    owner_name: enterprise.ownerName,
    address: enterprise.address,
    registered_at: enterprise.registeredAt,
    status: enterprise.status,
  });
}
