import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { ModelForm } from "@/components/admin/model-form";
import { PageBody, PageHeader, Panel } from "@/components/admin/page-header";
import { PriceEditor } from "@/components/admin/price-editor";
import { ExternalButton } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getAllSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Modèle" };

export default async function ModelPage({ params }: PageProps<"/admin/appareils/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: model } = await supabase.from("device_models").select("*, brands(name, slug)").eq("id", id).maybeSingle();
  if (!model) notFound();

  const [{ data: brands }, { data: categories }, { data: types }, { data: links }, { data: prices }, { data: siblings }, { site }] = await Promise.all([
    supabase.from("brands").select("id, name").order("sort_order").order("name"),
    supabase.from("device_categories").select("id, name").order("sort_order"),
    supabase.from("repair_types").select("id, name, icon").eq("is_active", true).order("sort_order"),
    supabase.from("repair_type_categories").select("repair_type_id, category_id"),
    supabase.from("repair_prices").select("*").eq("model_id", id).order("sort_order"),
    supabase
      .from("device_models")
      .select("id, name, repair_prices!inner(id)")
      .eq("brand_id", model.brand_id)
      .eq("category_id", model.category_id)
      .neq("id", id)
      .order("sort_order")
      .limit(300),
    getAllSettings(supabase),
  ]);

  const applicable = (types ?? []).filter((t) => {
    const cats = (links ?? []).filter((l) => l.repair_type_id === t.id).map((l) => l.category_id);
    return !cats.length || cats.includes(model.category_id) || (prices ?? []).some((p) => p.repair_type_id === t.id);
  });

  return (
    <>
      <PageHeader
        back={{ href: `/admin/appareils?marque=${model.brand_id}`, label: `Modèles ${model.brands?.name ?? ""}` }}
        title={`${model.brands?.name ?? ""} ${model.name}`}
        description={`Source : ${model.source === "appledb" ? "AppleDB" : model.source === "google_play" ? "Google Play" : model.source === "catalogue" ? "catalogue initial" : "ajout manuel"}${model.is_active ? "" : " · masqué sur le site"}`}
        actions={
          model.brands ? (
            <ExternalButton href={`/reparation/${model.brands.slug}/${model.slug}`} target="_blank" size="sm" variant="outline" icon={<ExternalLink className="size-4" />}>
              Voir sur le site
            </ExternalButton>
          ) : null
        }
      />
      <PageBody className="space-y-6">
        <PriceEditor
          modelId={model.id}
          currency={site.currency}
          repairTypes={applicable}
          copySources={(siblings ?? []).map((s) => ({ id: s.id, name: s.name }))}
          initial={(prices ?? []).map((p) => ({
            id: p.id,
            repair_type_id: p.repair_type_id,
            quality: p.quality,
            price: p.price === null ? null : Number(p.price),
            price_is_from: p.price_is_from,
            duration: p.duration ?? "",
            note: p.note ?? "",
            is_active: p.is_active,
            is_featured: p.is_featured,
          }))}
        />
        <Panel title="Informations du modèle">
          <ModelForm
            id={model.id}
            brands={brands ?? []}
            categories={categories ?? []}
            initial={{
              brand_id: model.brand_id,
              category_id: model.category_id,
              name: model.name,
              release_year: model.release_year,
              image_url: model.image_url,
              is_active: model.is_active,
              is_popular: model.is_popular,
              sort_order: model.sort_order,
            }}
          />
        </Panel>
      </PageBody>
    </>
  );
}
