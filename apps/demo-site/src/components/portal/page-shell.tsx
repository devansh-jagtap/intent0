import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

const RELATED = ["Citizen Charter", "Frequently Asked Questions", "User Manual (PDF)", "Fee Schedule", "Helpdesk"];

/** Breadcrumbs + title + a sidebar of related links, as on many portals. */
export function PageShell({ title, crumbs, children }: { title: string; crumbs: Crumb[]; children: ReactNode }) {
  return (
    <div id="main" className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-600 mb-3">
          <ol className="flex flex-wrap gap-1">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex gap-1">
                {i > 0 && <span aria-hidden>›</span>}
                {c.href ? (
                  <Link href={c.href} className="text-primary hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">{title}</h1>
        <div className="bg-white border rounded p-5">{children}</div>
      </div>
      <aside className="text-sm">
        <div className="bg-white border rounded">
          <p className="bg-slate-200 px-3 py-2 font-semibold">Related Links</p>
          <ul className="divide-y">
            {RELATED.map((r) => (
              <li key={r}>
                <a href="#" className="block px-3 py-2 text-primary hover:bg-slate-50">
                  {r}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/** A plain list of links, used by the menu-style pages of the maze. */
export function LinkList({ items }: { items: { label: string; href: string; note?: string }[] }) {
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.label} className="py-2">
          <Link href={item.href} className="text-primary font-medium hover:underline">
            {item.label}
          </Link>
          {item.note && <p className="text-xs text-slate-500">{item.note}</p>}
        </li>
      ))}
    </ul>
  );
}
