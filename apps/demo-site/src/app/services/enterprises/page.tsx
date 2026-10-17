import { LinkList, PageShell } from "@/components/portal/page-shell";

export default function EnterpriseServicesPage() {
  return (
    <PageShell
      title="Enterprise Services"
      crumbs={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, { label: "Enterprise Services" }]}
    >
      <LinkList
        items={[
          { label: "Registration", href: "/services/enterprises/registration", note: "New registration of enterprises" },
          { label: "Updation of Particulars", href: "/update", note: "Login required" },
          { label: "Print / Download Certificate", href: "/print", note: "Login required" },
          { label: "Cancellation of Registration", href: "/cancel", note: "Login required" },
          { label: "Frequently Asked Questions", href: "#" },
        ]}
      />
    </PageShell>
  );
}
