"use client";

import clsx from "clsx";
import { CloudDownload, Download, LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { importModels, loadAndroidBrands, loadCandidates, type ImportCandidate } from "@/app/admin/(dashboard)/appareils/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ANDROID_PARENT_BRAND, slugify, type CategorySlug } from "@/lib/catalog/normalize";

type Brand = { id: string; name: string; slug: string };

const CATEGORY_LABEL: Record<CategorySlug, string> = {
  smartphones: "Smartphone",
  tablettes: "Tablette",
  ordinateurs: "Ordinateur",
  consoles: "Console",
  montres: "Montre",
};

export function DeviceImporter({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [source, setSource] = useState<"apple" | "android">("apple");
  const [androidBrands, setAndroidBrands] = useState<{ key: string; label: string; count: number }[] | null>(null);
  const [androidKey, setAndroidKey] = useState("");
  const [target, setTarget] = useState<string>(""); // id de marque ou "new:Nom"
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [overrides, setOverrides] = useState<Record<string, CategorySlug>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategorySlug | "">("");
  const [minYear, setMinYear] = useState(2018);
  const [loading, start] = useTransition();
  const [importing, startImport] = useTransition();

  const brandById = (id: string) => brands.find((b) => b.id === id);

  function resolveTarget(label: string) {
    const slug = slugify(label);
    return brandById(brands.find((b) => b.slug === slug)?.id ?? "")?.id ?? `new:${label}`;
  }

  function load(nextSource: "apple" | "android", key?: string) {
    setCandidates(null);
    setSelected(new Set());
    setOverrides({});
    start(async () => {
      let targetValue = target;
      if (nextSource === "apple") targetValue = resolveTarget("Apple");
      else if (key) {
        const label = ANDROID_PARENT_BRAND[key] ?? androidBrands?.find((b) => b.key === key)?.label ?? key;
        targetValue = resolveTarget(label);
      }
      setTarget(targetValue);
      const brandId = targetValue.startsWith("new:") ? null : targetValue;
      const result = await loadCandidates(nextSource, brandId, key);
      if (!result.ok) return void toast.error(result.error);
      const list = result.data ?? [];
      setCandidates(list);
      // Présélection : modèles récents non encore importés
      setSelected(new Set(list.filter((c) => !c.exists && (nextSource === "android" || (c.releaseYear ?? 0) >= 2018)).map((c) => c.slug)));
    });
  }

  function chooseSource(next: "apple" | "android") {
    setSource(next);
    setCandidates(null);
    if (next === "apple") load("apple");
    else if (!androidBrands)
      start(async () => {
        const result = await loadAndroidBrands();
        if (result.ok) setAndroidBrands(result.data ?? []);
        else toast.error(result.error);
      });
  }

  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (candidates ?? []).filter((c) => {
      const cat = overrides[c.slug] ?? c.category;
      if (category && cat !== category) return false;
      if (source === "apple" && (c.releaseYear ?? 0) < minYear) return false;
      return terms.every((t) => c.name.toLowerCase().includes(t));
    });
  }, [candidates, overrides, category, source, minYear, query]);

  const selectable = visible.filter((c) => !c.exists);
  const allVisibleSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.slug));

  function runImport() {
    if (!candidates) return;
    const items = candidates
      .filter((c) => selected.has(c.slug) && !c.exists)
      .map((c) => ({ name: c.name, category: overrides[c.slug] ?? c.category, releaseYear: c.releaseYear }));
    if (!items.length) return toast.error("Sélectionnez au moins un modèle.");
    const brand = target.startsWith("new:") ? { name: target.slice(4) } : { id: target };
    startImport(async () => {
      const result = await importModels({ brand, source: source === "apple" ? "appledb" : "google_play", items });
      if (!result.ok) return void toast.error(result.error);
      toast.success(`${result.data?.imported ?? 0} modèle(s) importé(s)`);
      router.refresh();
      if (result.data?.brandId) router.push(`/admin/appareils?marque=${result.data.brandId}`);
    });
  }

  const categoriesPresent = [...new Set((candidates ?? []).map((c) => overrides[c.slug] ?? c.category))];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            { key: "apple", title: "Apple", text: "iPhone, iPad, Apple Watch, MacBook — via AppleDB, mis à jour en continu." },
            { key: "android", title: "Android", text: "Samsung, Xiaomi, Google, Oppo, Honor… — liste officielle Google Play des appareils certifiés." },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => chooseSource(s.key)}
            className={clsx("card p-5 text-left transition-colors", source === s.key && (candidates || s.key === "android") ? "border-ink ring-2 ring-ink/10" : "hover:border-ink")}
          >
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              <CloudDownload className="size-5 text-brand-strong" aria-hidden /> {s.title}
            </p>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </button>
        ))}
      </div>

      {source === "android" ? (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-64 flex-1">
            <label className="field-label" htmlFor="import-android-brand">Marque Android</label>
            <Select
              id="import-android-brand"
              aria-label="Marque Android"
              value={androidKey}
              onChange={(e) => {
                setAndroidKey(e.target.value);
                if (e.target.value) load("android", e.target.value);
              }}
              disabled={!androidBrands}
            >
              <option value="">{androidBrands ? "Choisir une marque…" : "Chargement de la liste Google Play…"}</option>
              {androidBrands?.slice(0, 400).map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label} ({b.count})
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <LoaderCircle className="size-4 animate-spin" /> Téléchargement et analyse de la source…
        </p>
      ) : null}

      {candidates ? (
        <div className="card">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="field-label" htmlFor="import-target-brand">Importer dans la marque</label>
              <Select
                id="import-target-brand"
                aria-label="Importer dans la marque"
                value={target}
                onChange={(e) => {
                  const value = e.target.value;
                  setTarget(value);
                  start(async () => {
                    const result = await loadCandidates(source, value.startsWith("new:") ? null : value, androidKey || undefined);
                    if (result.ok) setCandidates(result.data ?? []);
                  });
                }}
              >
                {target.startsWith("new:") ? <option value={target}>Nouvelle marque : {target.slice(4)}</option> : null}
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3">
              <Search className="size-4 text-muted" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrer…" className="h-11 w-full bg-transparent text-sm outline-none" aria-label="Filtrer les modèles" />
            </div>
            {source === "apple" ? (
              <div>
                <label className="field-label" htmlFor="import-min-year">Depuis</label>
                <Select id="import-min-year" value={minYear} onChange={(e) => setMinYear(Number(e.target.value))}>
                  {[2010, 2014, 2016, 2018, 2020, 2022, 2024].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <button type="button" onClick={() => setCategory("")} className={clsx("rounded-full border px-3 py-1 text-sm", !category ? "border-ink bg-ink text-on-fill" : "border-line-strong")}>
              Tout
            </button>
            {categoriesPresent.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={clsx("rounded-full border px-3 py-1 text-sm", category === c ? "border-ink bg-ink text-on-fill" : "border-line-strong")}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
            <span className="ml-auto text-sm text-muted">
              {visible.length} affiché(s) · <strong className="text-ink">{selected.size}</strong> sélectionné(s)
            </span>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-muted">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-strong"
                      aria-label="Tout sélectionner"
                      checked={allVisibleSelected}
                      onChange={() =>
                        setSelected((s) => {
                          const next = new Set(s);
                          for (const c of selectable) {
                            if (allVisibleSelected) next.delete(c.slug);
                            else next.add(c.slug);
                          }
                          return next;
                        })
                      }
                    />
                  </th>
                  <th className="px-2 py-2.5 font-semibold">Modèle</th>
                  <th className="px-2 py-2.5 font-semibold">Catégorie</th>
                  <th className="px-4 py-2.5 font-semibold">Année</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((c) => (
                  <tr key={c.slug} className={c.exists ? "text-muted" : undefined}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand-strong"
                        aria-label={`Sélectionner ${c.name}`}
                        disabled={c.exists}
                        checked={c.exists || selected.has(c.slug)}
                        onChange={() =>
                          setSelected((s) => {
                            const next = new Set(s);
                            if (next.has(c.slug)) next.delete(c.slug);
                            else next.add(c.slug);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      {c.name} {c.exists ? <Badge className="ml-2">Déjà au catalogue</Badge> : null}
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        className="min-h-9 rounded-md px-2 py-1 text-sm"
                        value={overrides[c.slug] ?? c.category}
                        disabled={c.exists}
                        aria-label={`Catégorie de ${c.name}`}
                        onChange={(e) => setOverrides((o) => ({ ...o, [c.slug]: e.target.value as CategorySlug }))}
                      >
                        {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-muted">{c.releaseYear ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length ? <p className="p-6 text-center text-sm text-muted">Aucun modèle ne correspond aux filtres.</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
            <p className="text-xs text-muted">Les modèles importés apparaissent sur le site, avec « Sur devis » tant qu’aucun tarif n’est saisi.</p>
            <Button loading={importing} disabled={!selected.size} icon={<Download className="size-4" />} onClick={runImport}>
              Importer {selected.size} modèle{selected.size > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
