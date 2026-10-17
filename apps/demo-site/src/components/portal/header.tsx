import Link from "next/link";

/** A deliberately crowded, old-style government header: many menu items, little guidance. */
const MENU = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "#" },
  { label: "Ministries & Departments", href: "#" },
  { label: "Services", href: "/services" },
  { label: "Schemes", href: "#" },
  { label: "Acts & Rules", href: "#" },
  { label: "Forms & Downloads", href: "#" },
  { label: "Notifications", href: "#" },
  { label: "Tenders", href: "#" },
  { label: "RTI", href: "#" },
  { label: "Grievances", href: "#" },
  { label: "Contact Us", href: "#" },
];

export function PortalHeader() {
  return (
    <header>
      <div className="bg-slate-800 text-slate-200 text-xs">
        <div className="max-w-6xl mx-auto px-4 py-1 flex flex-wrap gap-x-4 gap-y-1 justify-end">
          <a href="#main" className="hover:underline">Skip to main content</a>
          <span>Screen Reader Access</span>
          <span aria-hidden>A- A A+</span>
          <span>English | हिन्दी</span>
          <Link href="/login" className="hover:underline">Login</Link>
        </div>
      </div>
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="size-12 rounded-full bg-primary/90 text-primary-foreground grid place-items-center font-bold" aria-hidden>
            ES
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Department of Enterprise Affairs (fictional)</p>
            <p className="text-xl font-semibold text-primary">Enterprise Services Portal</p>
          </div>
        </div>
      </div>
      <nav className="bg-primary text-primary-foreground text-sm" aria-label="Main menu">
        <ul className="max-w-6xl mx-auto px-2 flex flex-wrap">
          {MENU.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="block px-3 py-2 hover:bg-white/10">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
