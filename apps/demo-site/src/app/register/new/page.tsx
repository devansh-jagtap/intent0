import { PageShell } from "@/components/portal/page-shell";
import { RegistrationForm } from "./registration-form";

export default function NewRegistrationPage() {
  return (
    <PageShell
      title="New Enterprise Registration Form"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Services", href: "/services" },
        { label: "Enterprise Services", href: "/services/enterprises" },
        { label: "Registration", href: "/services/enterprises/registration" },
        { label: "New Registration" },
      ]}
    >
      <RegistrationForm />
    </PageShell>
  );
}
