import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NoCopy } from "@/components/no-copy";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face" });

const description =
  "intent0 makes an existing website intent-driven. Visitors and AI agents say what they want; intent0 builds the right page from tasks you approved and sends it to your own APIs.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "intent0: make your website intent-driven",
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
  themeColor: "#08080c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <NoCopy />
        {children}
      </body>
    </html>
  );
}
