import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Intent0Bar } from "@/components/intent0-bar";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["700", "800"] });
const body = Hanken_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "intent0: make your website intent-driven", template: "%s | intent0" },
  description:
    "intent0 adds an Ask button to the website you already have. Visitors say what they want and get a page built for it, from tasks you approve and content you wrote.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <footer className="site-foot">
          <div className="wrap">
            <span>intent0. Your site, your model, your rules.</span>
            <span>
              <a href="/docs/getting-started">Docs</a> &nbsp; <a href="/dashboard">Dashboard</a>
            </span>
          </div>
        </footer>
        <Intent0Bar />
      </body>
    </html>
  );
}
