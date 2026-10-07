import clsx from "clsx";
import { ArrowRight, ArrowUpRight, ClipboardCheck, MapPin, MessageSquareText, PackageCheck, Phone, Search, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BrandMark, WhatsappIcon } from "@/components/icons";
import { AccessoryCard, RealisationCard, ReviewCard, SectionHeading, Stars } from "@/components/site/blocks";
import { DotGrid } from "@/components/site/dot-grid";
import { Marquee } from "@/components/site/marquee";
import { PriceEstimator } from "@/components/site/price-estimator";
import { RepairBento } from "@/components/site/repair-bento";
import { PhoneStage } from "@/components/three/phone-stage";
import { ButtonLink, ExternalButton } from "@/components/ui/button";
import { telLink, whatsappLink } from "@/lib/contact";
import { getGooglePlace } from "@/lib/data/google";
import {
  getAccessories,
  getCategories,
  getFeaturedBrands,
  getFeaturedPrices,
  getPublishedReviews,
  getRealisations,
  getRepairTypes,
  getSiteSettings,
} from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/env";
import { formatMoney, formatPhone } from "@/lib/format";
import heroImage from "../../../public/images/hero.png";

export const revalidate = 300;

const STEPS = [
  { icon: MessageSquareText, title: "Vous nous décrivez la panne", text: "En ligne, par WhatsApp ou en passant à l’atelier. Deux minutes suffisent." },
  { icon: Search, title: "Diagnostic transparent", text: "On identifie la cause et on vous explique, sans jargon, ce qui doit être réparé." },
  { icon: ClipboardCheck, title: "Devis validé par vous", text: "Prix et délai confirmés avant toute intervention. Aucune surprise." },
  { icon: PackageCheck, title: "Réparation & restitution", text: "Pièces de qualité, tests complets, puis vous récupérez votre appareil." },
];

// Boutons secondaires posés sur les scènes sombres, quel que soit le thème (pilule « Explore » d’apple.com).
// Fond sombre dépoli : le bouton reste lisible même quand des éclats de verre passent derrière.
const GHOST = "border-white/40 bg-black/40 text-white backdrop-blur-md hover:border-white hover:bg-white/10 hover:text-white";

export default async function HomePage() {
  if (!isSupabaseConfigured()) return null; // le layout affiche déjà <SetupNotice />
  const [settings, categories, brands, repairTypes, featuredPrices, realisations, accessories, reviewData] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getFeaturedBrands(),
    getRepairTypes(),
    getFeaturedPrices(),
    getRealisations(6),
    getAccessories({ limit: 8 }),
    getPublishedReviews(6),
  ]);
  const google = settings.google_place_id ? await getGooglePlace(settings.google_place_id) : null;

  const rating = google?.rating ?? reviewData.average;
  const ratingCount = google?.count ?? reviewData.count;
  const reviews = [...reviewData.reviews, ...(google?.reviews ?? [])].slice(0, 6);
  const whatsapp = whatsappLink(settings.whatsapp || settings.phone, `Bonjour ${settings.business_name}, j’aimerais un devis pour une réparation.`, settings.default_country);
  const phone = telLink(settings.phone, settings.default_country);
  const title = settings.hero_title || "Une seconde vie. Pas un nouvel appareil.";

  // ------------------------------------------------------- Accroche de la scène 3D (chapitre 1)
  const intro = (
    <div className="stage-intro">
      <p className="stage-eyebrow" data-intro-item>
        <span>
          Réparation{settings.city ? ` à ${settings.city}` : ""} · Smartphones · Tablettes<span className="hidden sm:inline"> · Consoles</span>
        </span>
      </p>
      <h1 className="stage-title" data-intro-title>
        {title.split(". ").map((part, i, arr) => (
          <span key={i} className={i === arr.length - 1 && arr.length > 1 ? "stage-title-dim" : undefined}>
            {part}
            {i < arr.length - 1 ? ". " : ""}
            {i < arr.length - 1 ? <br className="hidden sm:block" /> : null}
          </span>
        ))}
      </h1>
      <p className="stage-lead max-sm:hidden" data-intro-item>
        {settings.hero_subtitle ||
          "Écran cassé, batterie fatiguée, connecteur capricieux ou console qui chauffe ? Diagnostic transparent, devis clair et réparation soignée."}
      </p>
      <div className="mt-7 grid gap-3 sm:mt-9 sm:flex sm:flex-wrap" data-intro-item>
        <ButtonLink href="/devis" size="lg" icon={<ArrowUpRight className="size-4" />} data-magnetic>
          Demander un devis
        </ButtonLink>
        {whatsapp ? (
          <ExternalButton href={whatsapp} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" icon={<WhatsappIcon className="size-5" />}>
            WhatsApp
          </ExternalButton>
        ) : (
          <ButtonLink href="#tarifs" variant="outline" size="lg" className={GHOST}>
            Voir les tarifs
          </ButtonLink>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80 sm:mt-8" data-intro-item>
        {rating ? (
          <Link href="/avis" className="flex items-center gap-2">
            <Stars rating={rating} />
            <span className="font-semibold text-white">{rating.toFixed(1).replace(".", ",")}/5</span>
            <span className="text-white/60">· {ratingCount} avis</span>
          </Link>
        ) : null}
        {phone ? (
          <a href={phone} className="flex items-center gap-2 font-semibold text-white">
            <Phone className="size-4 text-brand" aria-hidden />
            {formatPhone(settings.phone, settings.default_country)}
          </a>
        ) : null}
      </div>
    </div>
  );

  // ------------------------------------------------- Fin du récit : appel à l’action (chapitre 4)
  const finale = (
    <div className="max-w-xl">
      <p className="stage-kicker">04 — Seconde vie</p>
      <h2 className="stage-heading">
        Votre appareil mérite <span className="text-gradient">une seconde vie.</span>
      </h2>
      <p className="stage-note">Décrivez la panne en deux minutes : devis gratuit, envoyé là où vous le souhaitez.</p>
      <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
        <ButtonLink href="/devis" size="lg" icon={<ArrowUpRight className="size-4" />} data-magnetic>
          Demander un devis
        </ButtonLink>
        <ButtonLink href="#tarifs" variant="outline" size="lg" className={GHOST}>
          Voir les tarifs
        </ButtonLink>
      </div>
    </div>
  );

  const fallback = (
    <div className="overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10">
      <Image
        src={heroImage}
        alt="Smartphone à l’écran fissuré, tablette et ordinateur portable prêts à être réparés"
        placeholder="blur"
        sizes="(min-width: 1024px) 44vw, 100vw"
        className="h-auto w-full"
      />
    </div>
  );

  return (
    <>
      {/* ------------------------------------------------------- Scène 3D : la réparation */}
      <PhoneStage intro={intro} finale={finale} fallback={fallback} />

      {/* ------------------------------------------------------------ Types d’appareils */}
      <section className="container-page py-14 sm:py-24">
        <SectionHeading
          eyebrow="Ce que nous réparons"
          title={<>À chaque appareil,<br />sa seconde chance.</>}
          text="Chaque appareil arrive en panne… et repart réparé. Survolez une carte pour relancer la réparation."
        />
        {/* Grille bento : chaque appareil se répare sous les yeux du visiteur (anime.js) */}
        <RepairBento categories={categories} />
        {brands.length ? (
          <div data-reveal="up" className="mt-14 sm:mt-20">
            <p className="text-center font-display text-[21px] font-semibold leading-tight tracking-[-0.02em]">
              Toutes les grandes marques. <span className="text-muted">Et bien d’autres.</span>
            </p>
            {/* Deux rangées en sens contraire ; chaque pastille rebondit au survol */}
            <div className="mt-7 grid gap-3">
              {[brands, [...brands].reverse()].map((row, rowIndex) => (
                <Marquee key={rowIndex} className="brand-marquee" speed={rowIndex ? 30 : 38} copies={3} reverse={rowIndex === 1} pauseOnHover>
                  {row.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/reparation/${brand.slug}`}
                      data-spring-hover
                      className="flex h-14 items-center rounded-full bg-surface px-6 text-ink/80 shadow-(--shadow-card) transition-colors hover:text-ink"
                      aria-label={`Réparation ${brand.name}`}
                    >
                      <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-5" className="text-[16px]" />
                    </Link>
                  ))}
                </Marquee>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* ------------------------------------------------------------------- Estimateur */}
      <section id="tarifs" className="scroll-mt-24 border-y border-line bg-surface">
        <div className="container-page py-14 sm:py-24">
          <SectionHeading
            eyebrow="Tarifs"
            title={<>Votre prix en<br />trois clics.</>}
            text="Choisissez votre appareil, sa marque et son modèle : les tarifs de chaque réparation s’affichent immédiatement."
            action={
              <ButtonLink href="/tarifs" variant="outline" icon={<Search className="size-4" />}>
                Tous les tarifs
              </ButtonLink>
            }
          />
          <div data-reveal="up" className="glow-frame">
            <PriceEstimator categories={categories} repairTypes={repairTypes} currency={settings.currency} />
          </div>

          {featuredPrices.length ? (
            <div className="mt-10 sm:mt-12">
              <h3 className="text-xl font-bold">Réparations populaires</h3>
              <ul data-reveal="stagger" className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                {featuredPrices.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/reparation/${item.device_models.brands.slug}/${item.device_models.slug}`}
                      data-tilt="4"
                      className="card flex items-center justify-between gap-4 p-4 transition-colors hover:border-brand/60"
                    >
                      <span>
                        <span className="block font-semibold">
                          {item.repair_types.name} {item.device_models.brands.name} {item.device_models.name}
                        </span>
                        {item.quality ? <span className="text-xs text-muted">{item.quality}</span> : null}
                      </span>
                      <span className="shrink-0 font-display text-lg font-extrabold">
                        {item.price_is_from ? <span className="text-xs font-semibold text-muted">dès </span> : null}
                        {item.price === null ? "Sur devis" : formatMoney(item.price, settings.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------- Méthode : cartes empilées */}
      {/* Gris #1d1d1f et cartes noires, comme les « highlights » d’apple.com.
          overflow-clip et non overflow-hidden : ce dernier créerait un conteneur de défilement et casserait les sticky */}
      <section data-ripple-host data-header-tone="dark" className="relative overflow-clip bg-night-soft text-snow">
        <DotGrid className="text-white" gap={36} />
        <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 size-140 rounded-full bg-cta/15 blur-[140px]" />
        <div className="container-page relative grid gap-12 py-16 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div data-reveal="heading" className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow">Comment ça marche</p>
            <h2 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
              Moins de tracas.
              <br />
              <span className="text-faint">Plus de bon sens.</span>
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#a1a1a6]">
              Réparer, c’est prolonger une histoire : vos photos, vos messages, vos habitudes. Et c’est un geste pour la planète.
            </p>
            <ButtonLink href="/devis" className="mt-8" icon={<ArrowUpRight className="size-4" />} data-magnetic>
              Commencer ma demande
            </ButtonLink>
          </div>
          <ol data-stack className="stack">
            {STEPS.map(({ icon: Icon, title: stepTitle, text }, index) => (
              <li key={stepTitle} className="stack-card" style={{ "--i": index } as CSSProperties}>
                <span aria-hidden className="stack-number">
                  0{index + 1}
                </span>
                <span className="stack-icon">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-auto pt-10 text-xl font-bold sm:text-2xl">
                  <span className="sr-only">Étape {index + 1} : </span>
                  {stepTitle}
                </h3>
                <p className="mt-2 max-w-sm text-[17px] leading-relaxed text-[#a1a1a6]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------------- Réalisations */}
      {realisations.length ? (
        <section className="container-page py-14 sm:py-24">
          <SectionHeading
            eyebrow="Nos réalisations"
            title={<>Des appareils réparés,<br />en images.</>}
            action={
              <ButtonLink href="/realisations" variant="outline" icon={<ArrowRight className="size-4" />}>
                Toutes les réalisations
              </ButtonLink>
            }
          />
          {/* Mobile : carrousel horizontal plutôt qu’une longue pile de cartes */}
          <div data-reveal="stagger" className="grid gap-5 max-sm:scroller-x max-sm:gap-3 max-sm:[--item-w:84%] sm:grid-cols-2 lg:grid-cols-3">
            {realisations.map((item) => (
              <RealisationCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ Accessoires */}
      {accessories.length ? (
        <section className="border-y border-line bg-surface">
          <div className="container-page py-14 sm:py-24">
            <SectionHeading
              eyebrow="Accessoires"
              title={<>Protégez-le,<br />dès aujourd’hui.</>}
              text="Coques, protections d’écran, chargeurs et câbles : réservez en ligne, récupérez à l’atelier."
              action={
                <ButtonLink href="/accessoires" variant="outline" icon={<ArrowRight className="size-4" />}>
                  Voir la boutique
                </ButtonLink>
              }
            />
            <div data-reveal="stagger" className="grid grid-cols-2 gap-3 max-sm:scroller-x max-sm:[--item-w:46%] sm:gap-5 lg:grid-cols-4">
              {accessories.slice(0, 8).map((item) => (
                <AccessoryCard key={item.id} item={item} currency={settings.currency} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------------- Avis */}
      <section className="container-page py-14 sm:py-24">
        <SectionHeading
          eyebrow="Avis clients"
          title={<>Des appareils réparés.<br />Des sourires retrouvés.</>}
          action={
            <div className="flex flex-col gap-5 md:items-end">
              {rating ? (
                <div className="flex items-center gap-4">
                  <p className="font-display text-6xl font-extrabold leading-none tracking-tighter sm:text-7xl" data-count={rating.toFixed(1)} data-decimals="1">
                    {rating.toFixed(1).replace(".", ",")}
                  </p>
                  <div>
                    <Stars rating={rating} animated className="[&_svg]:size-5" />
                    <p className="mt-1 text-sm text-muted">
                      {ratingCount} avis vérifié{ratingCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/avis#laisser-un-avis" variant="outline" icon={<Star className="size-4" />}>
                  Laisser un avis
                </ButtonLink>
                {settings.google_reviews_url ? (
                  <ExternalButton href={settings.google_reviews_url} target="_blank" rel="noopener noreferrer" variant="ghost">
                    Avis Google <ArrowUpRight className="size-4" aria-hidden />
                  </ExternalButton>
                ) : null}
              </div>
            </div>
          }
        />
        {reviews.length ? (
          <div
            data-reveal="stagger"
            className={clsx("grid gap-5 md:grid-cols-2 lg:grid-cols-3", reviews.length > 1 && "max-md:scroller-x max-md:gap-3 max-md:[--item-w:84%]")}
          >
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div data-reveal="up" className="card flex flex-col items-center gap-4 p-10 text-center">
            <p className="font-display text-xl font-bold">Soyez le premier à partager votre expérience.</p>
            <ButtonLink href="/avis#laisser-un-avis" icon={<Star className="size-4" />}>
              Laisser un avis
            </ButtonLink>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------------- Contact */}
      <section className="container-page pb-16 sm:pb-24">
        <div data-reveal="up" data-ripple-host className="cta-panel relative isolate grid overflow-hidden rounded-[28px] bg-night text-snow lg:grid-cols-[1.15fr_1fr]">
          <DotGrid className="text-white" gap={30} />
          <div aria-hidden className="cta-orb" />
          <div className="relative p-6 sm:p-12 lg:p-16">
            <p className="stage-kicker">Devis gratuit · Sans engagement</p>
            <h2 data-reveal="chars" className="mt-3 font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[60px]">
              Votre appareil a un souci ? <span className="whitespace-nowrap text-sky">Parlons-en.</span>
            </h2>
            <p className="mt-5 max-w-md text-[17px] text-[#a1a1a6]">Décrivez la panne en deux minutes et recevez votre devis là où vous le souhaitez.</p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <ButtonLink href="/devis" size="lg" icon={<ArrowUpRight className="size-4" />} data-magnetic>
                Demander un devis
              </ButtonLink>
              {whatsapp ? (
                <ExternalButton href={whatsapp} target="_blank" rel="noopener noreferrer" size="lg" className="bg-white text-night hover:bg-white/90" icon={<WhatsappIcon className="size-5 text-whatsapp" />}>
                  WhatsApp
                </ExternalButton>
              ) : null}
            </div>
            {settings.address ? (
              <p className="mt-8 flex items-start gap-2 text-sm text-white/75">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {settings.address}
                {settings.city ? `, ${settings.city}` : ""}
              </p>
            ) : null}
          </div>
          {settings.maps_embed_url ? (
            <iframe
              src={settings.maps_embed_url}
              title="Plan d’accès"
              className="relative min-h-72 w-full border-0 grayscale-[0.5] invert-[0.9] hue-rotate-180"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="relative hidden items-end justify-end p-16 lg:flex">
              <p className="max-w-xs text-right font-display text-3xl font-extrabold leading-tight tracking-[-0.03em] text-white/90">
                La vie continue.
                <br />
                <span className="text-gradient">Votre appareil aussi.</span>
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
