import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PortalHeader } from "@/components/portal/header";
import { PortalFooter } from "@/components/portal/footer";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Enterprise Services Portal (demo)",
  description: "Fictional government-style portal used to develop and demo intent0.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-100">
        <div className="bg-amber-100 text-amber-900 text-xs text-center py-1 px-4">
          Demo website for intent0 development. Fictional portal. The OTP is always <b>123456</b>.
        </div>
        <PortalHeader />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
        <PortalFooter />
      </body>
    </html>
  );
}
