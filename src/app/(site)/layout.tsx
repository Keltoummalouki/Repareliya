import type { Viewport } from "next";
import { Cursor } from "@/components/site/cursor";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { SiteMotion } from "@/components/site/motion";
import { PageTransition } from "@/components/site/page-transition";
import { Preloader } from "@/components/site/preloader";
import { ScrollProgress } from "@/components/site/scroll-progress";
import { SetupNotice } from "@/components/site/setup-notice";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { ShardBackdrop } from "@/components/three/shard-backdrop";
import { telLink, whatsappLink } from "@/lib/contact";
import { getSiteSettings, getSocialLinks } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/env";
// Styles de l’expérience animée (en-tête, scène 3D, rideaux…), propres au site public
import "./experience.css";

// Pages publiques mises en cache 5 min, et rafraîchies immédiatement après chaque
// modification depuis le tableau de bord (revalidatePath).
export const revalidate = 300;

// Donne accès à env(safe-area-inset-*) : la barre d’actions mobile reste au-dessus de l’indicateur d’accueil.
export const viewport: Viewport = { viewportFit: "cover" };

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const [settings, socials] = await Promise.all([getSiteSettings(), getSocialLinks()]);
  const whatsapp = settings.whatsapp || settings.phone;
  const whatsappHref = whatsappLink(whatsapp, `Bonjour ${settings.business_name}, j’ai une question sur une réparation.`, settings.default_country);
  const phoneHref = telLink(settings.phone, settings.default_country);

  return (
    <>
      {/* Défilement fluide d’abord : le préchargement et le menu mobile s’appuient sur lui */}
      <SmoothScroll />
      <Preloader name={settings.business_name} />
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-sm text-on-fill focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      {/* Éclats de verre en 3D derrière le haut des pages intérieures (l’accueil a sa propre scène) */}
      <ShardBackdrop />
      <Header
        businessName={settings.business_name}
        whatsappHref={whatsappHref}
        phoneHref={phoneHref}
        announcement={settings.announcement}
      />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} socials={socials} />
      <MobileActionBar whatsappHref={whatsappHref} phoneHref={phoneHref} />
      <ScrollProgress />
      <Cursor />
      <PageTransition />
      <SiteMotion />
    </>
  );
}
