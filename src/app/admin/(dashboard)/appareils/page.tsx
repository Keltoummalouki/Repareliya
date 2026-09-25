import type { Metadata } from "next";
import { Search } from "lucide-react";
import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { ModelsTable } from "@/components/admin/models-table";
import { NewModelButton } from "@/components/admin/model-form";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Appareils & tarifs" };

const PAGE_SIZE = 200;

export default async function ModelsPage({ searchParams }: PageProps<"/admin/appareils">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const brand = typeof params.marque === "string" ? params.marque : "";
  const category = typeof params.categorie === "string" ? params.categorie : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const page = Math.max(1, Number(params.page) || 1);

  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("id, name").order("sort_order").order("name"),
    supabase.from("device_categories").select("id, name").order("sort_order"),
  ]);

  let query = supabase
    .from("device_models")
    .select("id, name, release_year, is_active, is_popular, source, brands(name), device_categories(name), repair_prices(count)", { count: "exact" })
    .order("brand_id")
    .order("sort_order")
    .order("release_year", { ascending: false, nullsFirst: false })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (brand) query = query.eq("brand_id", brand);
  if (category) query = query.eq("category_id", category);
  if (q) query = query.ilike("name", `%${q.replace(/[%,()]/g, "")}%`);
  const { data: models, count } = await query;

  const rows = (models ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    brand: m.brands?.name ?? "",
    category: m.device_categories?.name ?? "",
    release_year: m.release_year,
    is_active: m.is_active,
    is_popular: m.is_popular,
    source: m.source,
    prices: m.repair_prices?.[0]?.count ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Appareils & tarifs"
        description={`${count ?? 0} modèle${(count ?? 0) > 1 ? "s" : ""}${brand || category || q ? " (filtrés)" : " au catalogue"}. Cliquez sur un modèle pour saisir ses tarifs.`}
        actions={<NewModelButton brands={brands ?? []} categories={categories ?? []} />}
      >
        <CatalogTabs active="modeles" />
      </PageHeader>
      <PageBody>
        <form className="mb-5 flex flex-wrap gap-2" action="/admin/appareils">
          <Select key={`category-${category}`} name="categorie" defaultValue={category} className="h-10 min-h-0 w-auto py-1.5 text-sm" aria-label="Catégorie">
            <option value="">Toutes catégories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select key={`brand-${brand}`} name="marque" defaultValue={brand} className="h-10 min-h-0 w-auto py-1.5 text-sm" aria-label="Marque" searchable searchPlaceholder="Rechercher une marque…">
            <option value="">Toutes marques</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <div className="flex min-w-56 flex-1 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3">
            <Search className="size-4 text-muted" aria-hidden />
            <input name="q" defaultValue={q} placeholder="Rechercher un modèle…" className="h-10 w-full bg-transparent text-sm outline-none" aria-label="Rechercher" />
          </div>
          <button type="submit" className="h-10 rounded-[10px] bg-ink px-4 text-sm font-semibold text-white">
            Filtrer
          </button>
        </form>
        <ModelsTable rows={rows} />
        {(count ?? 0) > PAGE_SIZE ? (
          <nav className="mt-5 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
            {page > 1 ? (
              <a className="rounded-lg border border-line-strong bg-surface px-3 py-1.5" href={`?marque=${brand}&categorie=${category}&q=${encodeURIComponent(q)}&page=${page - 1}`}>
                Précédent
              </a>
            ) : null}
            <span className="text-muted">
              Page {page} / {Math.ceil((count ?? 0) / PAGE_SIZE)}
            </span>
            {page * PAGE_SIZE < (count ?? 0) ? (
              <a className="rounded-lg border border-line-strong bg-surface px-3 py-1.5" href={`?marque=${brand}&categorie=${category}&q=${encodeURIComponent(q)}&page=${page + 1}`}>
                Suivant
              </a>
            ) : null}
          </nav>
        ) : null}
      </PageBody>
    </>
  );
}
