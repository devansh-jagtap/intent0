"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { GITHUB } from "@/components/site-header";

/** Footer for docs and dashboard pages. The home page closes with its own board. */
export function SiteFooter() {
  if (usePathname() === "/") return null;
  return (
    <footer className="mt-16 bg-paper-2">
      <div className="wrap flex flex-col gap-4 pt-10 pb-24 text-[15px] text-ink sm:flex-row sm:items-center sm:justify-between">
        <Logo size={22} />
        <p className="m-0">© 2026 Devansh Jagtap. All rights reserved.</p>
        <div className="flex gap-5">
          <Link href="/docs/getting-started" className="text-ink">
            Docs
          </Link>
          <Link href="/dashboard" className="text-ink">
            Dashboard
          </Link>
          <a href={GITHUB} className="text-ink">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
