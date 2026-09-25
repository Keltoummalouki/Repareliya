import "server-only";

// Avis Google (facultatif) via l'API Google Places (New).
// Nécessite GOOGLE_PLACES_API_KEY et l'identifiant du lieu dans les paramètres.
// Google ne renvoie que les 5 avis les plus pertinents : ils sont affichés
// tels quels, avec attribution, et mis en cache 12 h.

export type GoogleReview = {
  id: string;
  author_name: string;
  photoUrl: string | null;
  rating: number;
  comment: string;
  relative: string | null;
  created_at: string;
  source: "google";
};

export type GooglePlaceSummary = { rating: number | null; count: number; url: string | null; reviews: GoogleReview[] };

type PlacesResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    name: string;
    rating: number;
    relativePublishTimeDescription?: string;
    publishTime?: string;
    text?: { text: string };
    originalText?: { text: string };
    authorAttribution?: { displayName?: string; photoUri?: string };
  }[];
};

export async function getGooglePlace(placeId: string): Promise<GooglePlaceSummary | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !placeId) return null;
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      },
      next: { revalidate: 43200 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as PlacesResponse;
    return {
      rating: data.rating ?? null,
      count: data.userRatingCount ?? 0,
      url: data.googleMapsUri ?? null,
      reviews: (data.reviews ?? [])
        .filter((r) => (r.originalText?.text ?? r.text?.text ?? "").trim().length > 0)
        .map((r) => ({
          id: r.name,
          author_name: r.authorAttribution?.displayName ?? "Client Google",
          photoUrl: r.authorAttribution?.photoUri ?? null,
          rating: r.rating,
          comment: (r.originalText?.text ?? r.text?.text ?? "").trim(),
          relative: r.relativePublishTimeDescription ?? null,
          created_at: r.publishTime ?? new Date().toISOString(),
          source: "google" as const,
        })),
    };
  } catch {
    return null;
  }
}
