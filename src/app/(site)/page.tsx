import { ArrowRight, ArrowUpRight, ClipboardCheck, MapPin, MessageSquareText, PackageCheck, Phone, Search, Star, Wrench } from "lucide-react";
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
import { formatMoney, formatPhone } from "@/lib/format";
import heroImage from "../../../public/images/hero.png";

export const revalidate = 300;

export default async function HomePage() {
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
      <section className="container-page grid items-center gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pb-20">
        <div>
          <p className="eyebrow">Réparation{settings.city ? ` à ${settings.city}` : ""} · Smartphones · Tablettes · Consoles</p>
          <h1 className="mt-6 text-[44px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[70px]">
            {title.split(". ").map((part, i, arr) => (
              <span key={i} className={i === arr.length - 1 && arr.length > 1 ? "text-brand" : undefined}>
                {part}
                {i < arr.length - 1 ? ". " : ""}
                {i < arr.length - 1 ? <br className="hidden sm:block" /> : null}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            {settings.hero_subtitle ||
              "Écran cassé, batterie fatiguée, connecteur capricieux ou console qui chauffe ? Diagnostic transparent, devis clair et réparation soignée."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/devis" size="lg" icon={<ArrowUpRight className="size-4" />}>
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
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
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
        <div className="relative">
          <div className="overflow-hidden rounded-[22px] bg-[#efefea]">
            <Image src={heroImage} alt="Smartphone à l’écran fissuré, tablette et ordinateur portable prêts à être réparés" priority placeholder="blur" sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto w-full" />
          </div>
          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-(--shadow-float) sm:left-6">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-strong text-white">
              <Wrench className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-bold">Un petit souci ?</span>
              <span className="block text-xs text-muted">On regarde ça ensemble.</span>
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Types d'appareils */}
      <section className="border-y border-line bg-surface">
        <div className="container-page py-14 sm:py-20">
          <SectionHeading eyebrow="Ce que nous réparons" title={<>À chaque appareil,<br />sa seconde chance.</>} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/tarifs?categorie=${category.slug}`}
                className="group flex min-h-48 flex-col justify-between rounded-(--radius-card) border border-line bg-bg p-5 transition-colors hover:border-ink hover:bg-surface"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-xl bg-surface text-ink ring-1 ring-line group-hover:bg-ink group-hover:text-white">
                    <CategoryIcon icon={category.icon} className="size-6" />
                  </span>
                  <span className="text-xs font-semibold text-muted">0{index + 1}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{category.name}</h3>
                  {category.description ? <p className="mt-1 text-sm leading-relaxed text-muted">{category.description}</p> : null}
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-strong">
                    Voir les tarifs <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {brands.length ? (
            <div className="mt-12 flex flex-col gap-6 border-t border-line pt-10 lg:flex-row lg:items-center">
              <p className="shrink-0 font-display text-lg font-bold leading-tight">
                Toutes les grandes marques.<br />
                <span className="text-muted">Et bien d’autres.</span>
              </p>
              <ul className="flex flex-wrap items-center gap-x-8 gap-y-5 lg:ml-auto lg:justify-end">
                {brands.map((brand) => (
                  <li key={brand.id}>
                    <Link href={`/reparation/${brand.slug}`} className="text-ink/75 transition-colors hover:text-ink" aria-label={`Réparation ${brand.name}`}>
                      <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-6" className="text-[17px]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------- Estimateur */}
      <section id="tarifs" className="container-page scroll-mt-24 py-14 sm:py-20">
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
        <PriceEstimator categories={categories} repairTypes={repairTypes} currency={settings.currency} />

        {featuredPrices.length ? (
          <div className="mt-12">
            <h3 className="text-xl font-bold">Réparations populaires</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="bg-ink text-white">
        <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow !text-white">Comment ça marche</p>
            <h2 className="mt-4 text-[34px] font-extrabold leading-[1.08] sm:text-[44px]">
              Moins de tracas.<br />Plus de <span className="text-brand">bon sens.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-white/70">
              Réparer, c’est prolonger une histoire : vos photos, vos messages, vos habitudes. Et c’est un geste pour la planète.
            </p>
            <ButtonLink href="/devis" className="mt-8" icon={<ArrowUpRight className="size-4" />}>
              Commencer ma demande
            </ButtonLink>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: MessageSquareText, title: "Vous nous décrivez la panne", text: "En ligne, par WhatsApp ou en passant à l’atelier." },
              { icon: Search, title: "Diagnostic transparent", text: "On identifie la cause et on vous explique, sans jargon." },
              { icon: ClipboardCheck, title: "Devis validé par vous", text: "Prix et délai confirmés avant toute intervention." },
              { icon: PackageCheck, title: "Réparation & restitution", text: "Tests complets, puis vous récupérez votre appareil." },
            ].map(({ icon: Icon, title: stepTitle, text }, index) => (
              <li key={stepTitle} className="rounded-(--radius-card) border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-brand" aria-hidden />
                  <span className="font-display text-sm font-bold text-white/40">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold">{stepTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------ Réalisations */}
      {realisations.length ? (
        <section className="container-page py-14 sm:py-20">
          <SectionHeading
            eyebrow="Nos réalisations"
            title={<>Des appareils réparés,<br />en images.</>}
            action={
              <ButtonLink href="/realisations" variant="outline" icon={<ArrowRight className="size-4" />}>
                Toutes les réalisations
              </ButtonLink>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {realisations.map((item) => (
              <RealisationCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- Accessoires */}
      {accessories.length ? (
        <section className="border-y border-line bg-surface">
          <div className="container-page py-14 sm:py-20">
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
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {accessories.slice(0, 8).map((item) => (
                <AccessoryCard key={item.id} item={item} currency={settings.currency} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- Avis */}
      <section className="container-page py-14 sm:py-20">
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
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <p className="font-display text-xl font-bold">Soyez le premier à partager votre expérience.</p>
            <ButtonLink href="/avis#laisser-un-avis" icon={<Star className="size-4" />}>
              Laisser un avis
            </ButtonLink>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------- Contact */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="grid overflow-hidden rounded-[22px] bg-brand-strong text-white lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <h2 className="text-[32px] font-extrabold leading-[1.08] sm:text-[42px]">
              Votre appareil a un souci ?<br />Parlons-en.
            </h2>
            <p className="mt-4 max-w-md text-white/85">
              Décrivez la panne en deux minutes et recevez votre devis là où vous le souhaitez.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/devis" variant="dark" size="lg" icon={<ArrowUpRight className="size-4" />}>
                Demander un devis
              </ButtonLink>
              {whatsapp ? (
                <ExternalButton href={whatsapp} target="_blank" rel="noopener noreferrer" size="lg" className="bg-white text-ink hover:bg-white/90" icon={<WhatsappIcon className="size-5 text-whatsapp" />}>
                  WhatsApp
                </ExternalButton>
              ) : null}
            </div>
            {settings.address ? (
              <p className="mt-8 flex items-start gap-2 text-sm text-white/90">
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
              <p className="max-w-xs text-right font-display text-2xl font-bold leading-snug text-white/90">La vie continue. Votre appareil aussi.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
