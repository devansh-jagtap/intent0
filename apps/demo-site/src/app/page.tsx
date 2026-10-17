import Link from "next/link";

const WHATS_NEW = [
  "Circular 14/2026: revised turnover limits for micro enterprises",
  "Notice: scheduled maintenance on Sunday, 02:00–06:00",
  "Extension of last date for annual return filing",
  "Guidelines for credit guarantee scheme, phase III",
  "Public consultation on simplified registration rules",
];

const TILES = [
  {
    title: "Online Services",
    links: [
      { label: "Enterprise Services", href: "/services/enterprises" },
      { label: "All Services", href: "/services" },
      { label: "Track Grievance", href: "#" },
      { label: "Downloads", href: "#" },
    ],
  },
  {
    title: "Schemes",
    links: [
      { label: "Credit Guarantee", href: "#" },
      { label: "Market Support", href: "#" },
      { label: "Skill Training", href: "#" },
      { label: "Technology Upgrade", href: "#" },
    ],
  },
  {
    title: "Information",
    links: [
      { label: "Acts & Rules", href: "#" },
      { label: "Annual Reports", href: "#" },
      { label: "Statistics", href: "#" },
      { label: "Citizen Charter", href: "#" },
    ],
  },
];

export default function Home() {
  return (
    <div id="main" className="grid gap-6">
      <section className="bg-white border rounded">
        <p className="bg-primary text-primary-foreground px-4 py-2 font-semibold text-sm">What&apos;s New</p>
        <ul className="divide-y text-sm">
          {WHATS_NEW.map((item) => (
            <li key={item} className="px-4 py-2">
              <a href="#" className="text-primary hover:underline">
                {item}
              </a>
              <span className="ml-2 text-[10px] uppercase bg-red-600 text-white px-1 rounded">new</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {TILES.map((tile) => (
          <div key={tile.title} className="bg-white border rounded">
            <p className="bg-slate-200 px-4 py-2 font-semibold text-sm">{tile.title}</p>
            <ul className="p-4 space-y-2 text-sm">
              {tile.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-primary hover:underline">
                    » {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="bg-white border rounded p-4 text-sm text-slate-700">
        <p className="font-semibold mb-1">About the Portal</p>
        <p>
          The Enterprise Services Portal provides online services relating to enterprise registration, updation of
          particulars, issue of certificates and related matters under the applicable rules. Users are advised to
          read the instructions carefully before proceeding with any application.
        </p>
      </section>
    </div>
  );
}
