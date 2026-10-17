import { PageShell } from "@/components/portal/page-shell";
import { CancelForm } from "./cancel-form";

export default function CancelPage() {
  return (
    <PageShell
      title="Cancellation of Registration"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Services", href: "/services" },
        { label: "Enterprise Services", href: "/services/enterprises" },
        { label: "Cancellation" },
      ]}
    >
      <CancelForm />
    </PageShell>
  );
}
