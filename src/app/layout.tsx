import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeColorSync, ThemedToaster } from "@/components/theme";
import { siteUrl } from "@/lib/env";
import { introScript } from "@/lib/page-gate";
import { DARK_QUERY, THEME_COLORS, themeScript } from "@/lib/theme";
import "./globals.css";

// Typographie à la manière d’apple.com : SF Pro, police du système, sur les appareils Apple
// (-apple-system dans --font-sans) ; ailleurs Inter, sa plus proche cousine libre de droits.
// L’axe « opsz » donne des coupes plus serrées aux grandes tailles, comme SF Pro Display.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", axes: ["opsz"] });

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
    // data-theme (et data-intro au premier passage) sont posés par les scripts de <head> avant l’hydratation
    <html lang="fr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ThemedToaster position="top-center" richColors closeButton />
        <ThemeColorSync />
      </body>
    </html>
  );
}
