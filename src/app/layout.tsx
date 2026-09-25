import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Repareliya — Réparation de smartphones, tablettes et consoles",
    template: "%s · Repareliya",
  },
  description:
    "Écran cassé, batterie fatiguée, console en panne ? Repareliya répare vos smartphones, tablettes, ordinateurs et consoles. Demandez votre devis en ligne.",
  applicationName: "Repareliya",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Repareliya" },
};

export const viewport: Viewport = {
  themeColor: "#f9f9f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
