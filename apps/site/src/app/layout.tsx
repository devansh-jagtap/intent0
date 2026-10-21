import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { Intent0Bar } from "@/components/intent0-bar";
import { Logo } from "@/components/logo";
import { NoCopy } from "@/components/no-copy";
import { GITHUB, SiteHeader } from "@/components/site-header";
import "./globals.css";

const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", weight: ["400", "500", "600", "700", "800", "900"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face" });

const description =
  "intent0 makes an existing website intent-driven. Visitors and AI agents say what they want; intent0 builds the right page from tasks you approved and sends it to your own APIs.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "intent0: make your website intent-driven", template: "%s | intent0" },
  description,
  openGraph: {
    title: "intent0: make your website intent-driven",
    description,
    images: [{ url: "/media/poster.jpg", width: 1600, height: 900 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "intent0", description, images: ["/media/poster.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#edf1f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <NoCopy />
        {/* Rough edges for the rubber stamp's ink. */}
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="stamp-ink">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
        </svg>
        <SiteHeader />
        {children}
        <footer className="border-t border-rule">
          <div className="wrap flex flex-col gap-4 pt-10 pb-24 text-[15px] text-pencil sm:flex-row sm:items-center sm:justify-between">
            <Logo size={22} />
            <p className="m-0">© 2026 Devansh Jagtap. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/docs/getting-started" className="text-pencil hover:text-ink">
                Docs
              </Link>
              <Link href="/dashboard" className="text-pencil hover:text-ink">
                Dashboard
              </Link>
              <a href={GITHUB} className="text-pencil hover:text-ink">
                GitHub
              </a>
            </div>
          </div>
        </footer>
        <Intent0Bar />
      </body>
    </html>
  );
}
