import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { GoogleIcon } from "@/components/icons";
import { ReviewCard, SectionHeading, Stars } from "@/components/site/blocks";
import { ReviewForm } from "@/components/site/review-form";
import { ExternalButton } from "@/components/ui/button";
import { getGooglePlace } from "@/lib/data/google";
import { getPublishedReviews, getSiteSettings } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/env";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Avis clients",
  description: "Ce que nos clients pensent de nos réparations de smartphones, tablettes et consoles.",
};

export default async function AvisPage() {
  if (!isSupabaseConfigured()) return null; // le layout affiche déjà <SetupNotice />
  const [settings, data] = await Promise.all([getSiteSettings(), getPublishedReviews(60)]);
  const google = settings.google_place_id ? await getGooglePlace(settings.google_place_id) : null;
  const reviewsUrl = settings.google_reviews_url || google?.url;

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading eyebrow="Avis clients" title={<>Ils nous ont confié<br />leur appareil.</>} />

      <div data-reveal="stagger" className="mb-10 grid gap-4 sm:grid-cols-2">
        {data.average ? (
          <div className="card flex items-center gap-5 p-6">
            <p className="font-display text-5xl font-extrabold">{data.average.toFixed(1).replace(".", ",")}</p>
            <div>
              <Stars rating={data.average} />
              <p className="mt-1 text-sm text-muted">{data.count} avis sur ce site</p>
            </div>
          </div>
        ) : null}
        {google?.rating ? (
          <div className="card flex items-center gap-5 p-6">
            <p className="font-display text-5xl font-extrabold">{google.rating.toFixed(1).replace(".", ",")}</p>
            <div>
              <Stars rating={google.rating} />
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <GoogleIcon className="size-3.5" aria-hidden /> {google.count} avis Google
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {data.reviews.length || google?.reviews.length ? (
        <div data-reveal="stagger" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {google?.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <p className="card p-8 text-center text-muted">Aucun avis publié pour le moment. Soyez le premier !</p>
      )}

      <section id="laisser-un-avis" data-reveal="stagger" className="mt-16 grid scroll-mt-28 gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl font-extrabold">Votre avis compte</h2>
          <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
            Racontez-nous votre expérience. Les avis sont publiés après une courte vérification.
          </p>
          {reviewsUrl ? (
            <ExternalButton href={reviewsUrl} target="_blank" rel="noopener noreferrer" variant="outline" className="mt-6" icon={<GoogleIcon className="size-4" />}>
              Laisser aussi un avis Google <ArrowUpRight className="size-4" aria-hidden />
            </ExternalButton>
          ) : null}
        </div>
        <ReviewForm />
      </section>
    </div>
  );
}
