import { LinkList, PageShell } from "@/components/portal/page-shell";

export default function ServicesPage() {
  return (
    <PageShell title="Services" crumbs={[{ label: "Home", href: "/" }, { label: "Services" }]}>
      <LinkList
        items={[
          { label: "Enterprise Services", href: "/services/enterprises", note: "Registration, updation, certificates" },
          { label: "Scheme Services", href: "#", note: "Apply for schemes and subsidies" },
          { label: "Grievance Services", href: "#", note: "Lodge and track grievances" },
          { label: "Information Services", href: "#", note: "RTI and public information" },
          { label: "Payment Services", href: "#", note: "Fees and challans" },
        ]}
      />
    </PageShell>
  );
}
