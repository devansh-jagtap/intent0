"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/docs/getting-started", label: "Docs", match: "/docs" },
  { href: "/dashboard", label: "Dashboard", match: "/dashboard" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="site-head">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="intent0 home">
          intent<b>0</b>
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path.startsWith(l.match) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <a className="hide-sm" href="/docs/getting-started#set-it-up">
            Install
          </a>
        </nav>
      </div>
    </header>
  );
}
