import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { ThemeColorSync, ThemedToaster } from "@/components/theme";
import { siteUrl } from "@/lib/env";
import { DARK_QUERY, THEME_COLORS, themeScript } from "@/lib/theme";
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
    "Écran cassé, batterie fatiguée, console en panne ? Repareliya répare vos smartphones, tablettes, ordinateurs et consoles. Demandez votre devis en ligne.",
  applicationName: "Repareliya",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Repareliya" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: DARK_QUERY, color: THEME_COLORS.dark },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme est posé par themeScript avant l’hydratation
    <html lang="fr" className={`${dmSans.variable} ${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ThemedToaster position="top-center" richColors closeButton />
        <ThemeColorSync />
      </body>
    </html>
  );
}
