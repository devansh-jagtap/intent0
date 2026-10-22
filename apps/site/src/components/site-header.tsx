"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GithubIcon, Logo } from "@/components/logo";

export const GITHUB = "https://github.com/devansh-jagtap/intent0";

const LINKS = [
  { href: "/#how", label: "How it works", match: null },
  { href: "/#agents", label: "Agents", match: null },
  { href: "/docs/getting-started", label: "Docs", match: "/docs" },
  { href: "/dashboard", label: "Dashboard", match: "/dashboard" },
];

export function SiteHeader() {
  const path = usePathname();
  // The home page is one board of tiles with its own links at the top.
  if (path === "/") return null;
  return (
    <header className="sticky top-0 z-40 bg-paper-2">
      <nav className="wrap flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Link href="/" aria-label="intent0 home" className="text-ink no-underline">
          <Logo size={28} />
        </Link>
        <div className="flex items-center gap-1 sm:gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.match && path.startsWith(l.match) ? "page" : undefined}
              className={`rounded-md px-2 py-1 text-[15px] text-ink no-underline hover:text-stamp aria-[current=page]:font-semibold aria-[current=page]:text-stamp ${l.match ? "" : "hidden md:inline"}`}
            >
              {l.label}
            </Link>
          ))}
          <a href={GITHUB} className="btn small ml-1" aria-label="intent0 on GitHub">
            <GithubIcon className="size-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
