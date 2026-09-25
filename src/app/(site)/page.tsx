import clsx from "clsx";
import { ArrowRight, ArrowUpRight, ChevronRight, ClipboardCheck, MapPin, MessageSquareText, PackageCheck, Phone, Search, Star, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark, CategoryIcon, WhatsappIcon } from "@/components/icons";
import { AccessoryCard, RealisationCard, ReviewCard, SectionHeading, Stars } from "@/components/site/blocks";
import { PriceEstimator } from "@/components/site/price-estimator";
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

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      {/* Mobile : titre, image, puis texte et boutons. En lg : texte à gauche (titre en haut, reste en bas), image à droite sur les deux rangées */}
      <section className="container-page grid items-center gap-10 pb-14 pt-8 sm:pt-14 lg:grid-cols-[1.02fr_1fr] lg:gap-x-14 lg:gap-y-0 lg:pb-20">
        <div data-reveal="heading" className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="eyebrow">
            {/* Un seul élément flex (l’eyebrow espace ses enfants) ; « Consoles » masqué sur mobile pour tenir sur une ligne */}
            <span>
              Réparation{settings.city ? ` à ${settings.city}` : ""} · Smartphones · Tablettes<span className="hidden sm:inline"> · Consoles</span>
            </span>
          </p>
          <h1 className="mt-5 text-[42px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:mt-6 sm:text-6xl lg:text-[70px]">
            {title.split(". ").map((part, i, arr) => (
              <span key={i} className={i === arr.length - 1 && arr.length > 1 ? "text-brand" : undefined}>
                {part}
                {i < arr.length - 1 ? ". " : ""}
                {i < arr.length - 1 ? <br className="hidden sm:block" /> : null}
              </span>
            ))}
          </h1>
        </div>
        <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1" data-parallax>
          <div className="overflow-hidden rounded-[22px] bg-subtle">
            <Image src={heroImage} alt="Smartphone à l’écran fissuré, tablette et ordinateur portable prêts à être réparés" priority placeholder="blur" sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto w-full" />
          </div>
          <div data-reveal="pop" className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-(--shadow-float) sm:left-6">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-strong text-on-fill">
              <Wrench className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-bold">Un petit souci ?</span>
              <span className="block text-xs text-muted">On regarde ça ensemble.</span>
            </span>
          </div>
        </div>
        <div data-reveal="stagger" className="lg:col-start-1 lg:row-start-2 lg:mt-6 lg:self-start">
          <p className="max-w-lg text-[17px] leading-relaxed text-ink-soft sm:text-lg">
            {settings.hero_subtitle ||
              "Écran cassé, batterie fatiguée, connecteur capricieux ou console qui chauffe ? Diagnostic transparent, devis clair et réparation soignée."}
          </p>
          {/* Sur mobile, boutons pleine largeur : plus faciles à viser au pouce */}
          <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
            <ButtonLink href="/devis" size="lg" icon={<ArrowUpRight className="size-4" />} data-magnetic>
              Demander un devis
            </ButtonLink>
            {whatsapp ? (
              <ExternalButton href={whatsapp} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" icon={<WhatsappIcon className="size-5" />}>
                WhatsApp
              </ExternalButton>
            ) : (
              <ButtonLink href="#tarifs" variant="outline" size="lg">
                Voir les tarifs
              </ButtonLink>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm sm:mt-8 sm:justify-start">
            {rating ? (
              <Link href="/avis" className="flex items-center gap-2">
                <Stars rating={rating} />
                <span className="font-semibold">{rating.toFixed(1).replace(".", ",")}/5</span>
                <span className="text-muted">· {ratingCount} avis</span>
              </Link>
            ) : null}
            {phone ? (
              <a href={phone} className="flex items-center gap-2 font-semibold">
                <Phone className="size-4 text-brand-strong" aria-hidden />
                {formatPhone(settings.phone, settings.default_country)}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Types d'appareils */}
      <section className="border-y border-line bg-surface">
        <div className="container-page py-12 sm:py-20">
          <SectionHeading eyebrow="Ce que nous réparons" title={<>À chaque appareil,<br />sa seconde chance.</>} />
          {/* Mobile : une ligne compacte par appareil ; à partir de sm, les grandes cartes */}
          <div data-reveal="stagger" className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/tarifs?categorie=${category.slug}`}
                className="group flex items-center gap-4 rounded-(--radius-card) border border-line bg-bg p-3.5 transition-colors hover:border-ink hover:bg-surface sm:min-h-48 sm:flex-col sm:items-stretch sm:justify-between sm:p-5"
              >
                <div className="flex shrink-0 items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-xl bg-surface text-ink ring-1 ring-line group-hover:bg-ink group-hover:text-on-fill">
                    <CategoryIcon icon={category.icon} className="size-6" />
                  </span>
                  <span className="hidden text-xs font-semibold text-muted sm:inline">0{index + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-bold sm:text-xl">{category.name}</h3>
                  {category.description ? (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted sm:mt-1 sm:line-clamp-none sm:leading-relaxed">{category.description}</p>
                  ) : null}
                  <span className="mt-3 hidden items-center gap-1 text-sm font-semibold text-brand-strong sm:inline-flex">
                    Voir les tarifs <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
                <ChevronRight className="size-5 shrink-0 text-faint sm:hidden" aria-hidden />
              </Link>
            ))}
          </div>
          {brands.length ? (
            <div data-reveal="brands" className="mt-10 grid gap-5 border-t border-line pt-8 sm:mt-12 sm:gap-8 sm:pt-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16">
              <p className="font-display text-lg font-bold leading-tight">
                Toutes les grandes marques.<br />
                <span className="text-muted">Et bien d’autres.</span>
              </p>
              {/* Mobile : rangée de pastilles qui défile ; à partir de md, la grille de logos */}
              <ul className="grid grid-cols-2 gap-x-6 gap-y-5 max-md:scroller-x max-md:gap-2 md:grid-cols-5">
                {brands.map((brand) => (
                  <li key={brand.id} className="flex md:justify-center">
                    <Link
                      href={`/reparation/${brand.slug}`}
                      className="flex h-9 items-center text-ink/75 transition-colors hover:text-ink max-md:h-11 max-md:rounded-full max-md:border max-md:border-line-strong max-md:bg-bg max-md:px-4 max-md:text-ink"
                      aria-label={`Réparation ${brand.name}`}
                    >
                      <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-5 md:size-6" className="text-[15px] md:text-[17px]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------- Estimateur */}
      <section id="tarifs" className="container-page scroll-mt-24 py-12 sm:py-20">
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
        <div data-reveal="up">
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
                    className="card flex items-center justify-between gap-4 p-4 transition-colors hover:border-ink"
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
      </section>

      {/* ---------------------------------------------------------- Méthode */}
      <section className="bg-charcoal text-white">
        <div className="container-page grid gap-10 py-14 sm:gap-12 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-reveal="heading">
            <p className="eyebrow !text-white">Comment ça marche</p>
            <h2 className="mt-4 text-[30px] font-extrabold leading-[1.08] sm:text-[44px]">
              Moins de tracas.<br />Plus de <span className="text-brand">bon sens.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-white/70">
              Réparer, c’est prolonger une histoire : vos photos, vos messages, vos habitudes. Et c’est un geste pour la planète.
            </p>
            <ButtonLink href="/devis" className="mt-8" icon={<ArrowUpRight className="size-4" />} data-magnetic>
              Commencer ma demande
            </ButtonLink>
          </div>
          {/* Mobile : frise verticale compacte ; à partir de sm, les cartes en grille */}
          <ol data-reveal="stagger" className="grid sm:grid-cols-2 sm:gap-4">
            {[
              { icon: MessageSquareText, title: "Vous nous décrivez la panne", text: "En ligne, par WhatsApp ou en passant à l’atelier." },
              { icon: Search, title: "Diagnostic transparent", text: "On identifie la cause et on vous explique, sans jargon." },
              { icon: ClipboardCheck, title: "Devis validé par vous", text: "Prix et délai confirmés avant toute intervention." },
              { icon: PackageCheck, title: "Réparation & restitution", text: "Tests complets, puis vous récupérez votre appareil." },
            ].map(({ icon: Icon, title: stepTitle, text }, index) => (
              <li
                key={stepTitle}
                className="group/step relative flex gap-4 pb-6 last:pb-0 sm:block sm:rounded-(--radius-card) sm:border sm:border-white/10 sm:bg-white/[0.04] sm:p-6"
              >
                <span aria-hidden className="absolute bottom-0 left-5 top-11 w-px bg-white/15 group-last/step:hidden sm:hidden" />
                <div className="flex shrink-0 items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-full bg-white/[0.06] ring-1 ring-white/15 sm:contents">
                    <Icon className="size-5 text-brand sm:size-6" aria-hidden />
                  </span>
                  <span className="hidden font-display text-sm font-bold text-white/40 sm:inline">0{index + 1}</span>
                </div>
                <div className="pt-1.5 sm:pt-0">
                  <h3 className="text-base font-bold sm:mt-6 sm:text-lg">
                    <span className="mr-1.5 text-white/40 sm:hidden">0{index + 1}</span>
                    {stepTitle}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65 sm:mt-2">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------ Réalisations */}
      {realisations.length ? (
        <section className="container-page py-12 sm:py-20">
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

      {/* ------------------------------------------------------- Accessoires */}
      {accessories.length ? (
        <section className="border-y border-line bg-surface">
          <div className="container-page py-12 sm:py-20">
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

      {/* -------------------------------------------------------------- Avis */}
      <section className="container-page py-12 sm:py-20">
        <SectionHeading
          eyebrow="Avis clients"
          title={<>Des appareils réparés.<br />Des sourires retrouvés.</>}
          action={
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

      {/* ----------------------------------------------------------- Contact */}
      <section className="container-page pb-14 sm:pb-24">
        <div data-reveal="up" className="grid overflow-hidden rounded-[22px] bg-brand-strong text-on-fill lg:grid-cols-2">
          <div data-reveal="heading" className="p-6 sm:p-12">
            <h2 className="text-[28px] font-extrabold leading-[1.08] sm:text-[42px]">
              Votre appareil a un souci ?<br />Parlons-en.
            </h2>
            <p className="mt-4 max-w-md text-on-fill/85">
              Décrivez la panne en deux minutes et recevez votre devis là où vous le souhaitez.
            </p>
            <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
              <ButtonLink href="/devis" variant="dark" size="lg" icon={<ArrowUpRight className="size-4" />} data-magnetic>
                Demander un devis
              </ButtonLink>
              {whatsapp ? (
                <ExternalButton href={whatsapp} target="_blank" rel="noopener noreferrer" size="lg" className="bg-surface text-ink hover:bg-surface/90" icon={<WhatsappIcon className="size-5 text-whatsapp" />}>
                  WhatsApp
                </ExternalButton>
              ) : null}
            </div>
            {settings.address ? (
              <p className="mt-8 flex items-start gap-2 text-sm text-on-fill/90">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                {settings.address}
                {settings.city ? `, ${settings.city}` : ""}
              </p>
            ) : null}
          </div>
          {settings.maps_embed_url ? (
            <iframe
              src={settings.maps_embed_url}
              title="Plan d’accès"
              className="min-h-72 w-full border-0 grayscale-[0.3]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="hidden items-end justify-end bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.22),transparent_60%)] p-12 lg:flex">
              <p className="max-w-xs text-right font-display text-2xl font-bold leading-snug text-on-fill/90">La vie continue. Votre appareil aussi.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
