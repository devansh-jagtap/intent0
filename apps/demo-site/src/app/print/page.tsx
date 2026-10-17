import { PageShell } from "@/components/portal/page-shell";
import { PrintForm } from "./print-form";

export default function PrintPage() {
  return (
    <PageShell
      title="Print / Download Certificate"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Services", href: "/services" },
        { label: "Enterprise Services", href: "/services/enterprises" },
        { label: "Print Certificate" },
      ]}
    >
      <PrintForm />
    </PageShell>
  );
}
