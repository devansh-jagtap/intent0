import { PageShell } from "@/components/portal/page-shell";
import { UpdateForm } from "./update-form";

export default function UpdatePage() {
  return (
    <PageShell
      title="Updation of Particulars"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Services", href: "/services" },
        { label: "Enterprise Services", href: "/services/enterprises" },
        { label: "Updation" },
      ]}
    >
      <UpdateForm />
    </PageShell>
  );
}
