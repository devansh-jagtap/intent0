import Link from "next/link";
import { PageShell } from "@/components/portal/page-shell";

export default function RegistrationInstructionsPage() {
  return (
    <PageShell
      title="Registration of Enterprises: Instructions"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Services", href: "/services" },
        { label: "Enterprise Services", href: "/services/enterprises" },
        { label: "Registration" },
      ]}
    >
      <div className="text-sm text-slate-700 space-y-3">
        <p>Please read the following instructions before proceeding.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Registration is free of cost. No agent or consultant is authorised by the Department.</li>
          <li>Keep your Aadhaar number and PAN ready. An OTP will be sent to the mobile number linked with Aadhaar.</li>
          <li>Select the correct activity code from the list of activity codes (see Annexure II).</li>
          <li>Applicants already registered must use “Updation of Particulars” and not apply again.</li>
          <li>Entering false information is an offence under the applicable rules.</li>
        </ol>
        <p className="font-medium">Choose the applicable option:</p>
        <ul className="space-y-2">
          <li>
            <Link href="/register/new" className="text-primary font-medium hover:underline">
              » For new entrepreneurs who are not yet registered
            </Link>
          </li>
          <li>
            <Link href="/update" className="text-primary hover:underline">
              » For those already registered (updation)
            </Link>
          </li>
        </ul>
      </div>
    </PageShell>
  );
}
