import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { Intent0Bar } from "@/components/intent0-bar";
import { NoCopy } from "@/components/no-copy";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import { cn } from "@/lib/utils";

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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(sans.variable, mono.variable, "font-sans")}>
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
        <SiteFooter />
        <Intent0Bar />
      </body>
    </html>
  );
}
