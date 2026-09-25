import type { Metadata } from "next";
import { Clock, FileText, MessageCircle, ShieldCheck } from "lucide-react";
import { DevisForm } from "@/components/site/devis-form";
import { getCategories, getRepairTypes, getSiteSettings } from "@/lib/data/public";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Demande de devis",
  description: "Décrivez la panne de votre appareil et recevez votre devis par WhatsApp, téléphone ou e-mail.",
};

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROMISES = [
  { icon: MessageCircle, title: "Vous choisissez le canal", text: "WhatsApp, appel, SMS ou e-mail : on s’adapte à vous." },
  { icon: FileText, title: "Un devis clair", text: "Le détail des pièces et de la main-d’œuvre, sans surprise." },
  { icon: ShieldCheck, title: "Aucune intervention sans accord", text: "Vous validez le devis avant la réparation." },
  { icon: Clock, title: "Un délai annoncé", text: "Le délai de réparation est indiqué dans votre devis." },
];

function Promises({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {PROMISES.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
            <Icon className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold">{title}</span>
            <span className="block text-sm text-muted">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DevisPage({ searchParams }: PageProps<"/devis">) {
  const params = await searchParams;
  const modelId = typeof params.modele === "string" && uuidRe.test(params.modele) ? params.modele : null;
  const repairIds = (Array.isArray(params.reparation) ? params.reparation : String(params.reparation ?? "").split(","))
    .filter((id) => uuidRe.test(id));
  const accessoryId = typeof params.accessoire === "string" && uuidRe.test(params.accessoire) ? params.accessoire : null;

  const supabase = createPublicClient();
  const [settings, categories, repairTypes, modelResult, accessoryResult] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getRepairTypes(),
    modelId
      ? supabase.from("device_models").select("id, name, brand_id, category_id, brands(name, slug)").eq("id", modelId).maybeSingle()
      : Promise.resolve({ data: null }),
    accessoryId
      ? supabase.from("accessories").select("id, name, price").eq("id", accessoryId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const model = modelResult.data;
  const accessory = accessoryResult.data;

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.55fr] lg:gap-14">
        <aside data-reveal="heading" className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{accessory ? "Réservation" : "Devis gratuit"}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            {accessory ? "Réserver un accessoire" : "Demandez votre devis"}
          </h1>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft sm:mt-5">
            {accessory
              ? "Laissez-nous vos coordonnées : nous confirmons la disponibilité et mettons l’article de côté pour vous."
              : "Quelques informations suffisent. Nous vous envoyons le devis là où vous le préférez : WhatsApp, téléphone ou e-mail."}
          </p>
          {/* Sur mobile, ces garanties passent sous le formulaire : on commence directement la demande */}
          <Promises className="mt-8 hidden gap-5 lg:grid" />
        </aside>
        <DevisForm
          kind={accessory ? "accessoire" : "devis"}
          categories={categories}
          repairTypes={repairTypes}
          currency={settings.currency}
          country={settings.default_country}
          initialRepairIds={repairIds}
          accessory={accessory ? { id: accessory.id, name: accessory.name, price: accessory.price === null ? null : Number(accessory.price) } : null}
          initialModel={
            model
              ? {
                  id: model.id,
                  name: model.name,
                  brand_id: model.brand_id,
                  brand_name: model.brands?.name ?? "",
                  brand_slug: model.brands?.slug ?? "",
                  category_id: model.category_id,
                }
              : null
          }
        />
        <Promises className="grid gap-5 sm:grid-cols-2 lg:hidden" />
      </div>
    </div>
  );
}
