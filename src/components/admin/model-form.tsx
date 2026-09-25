"use client";

import { Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveModel } from "@/app/admin/(dashboard)/appareils/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { ImageUpload } from "./image-upload";

type Option = { id: string; name: string };
type ModelValues = {
  brand_id: string;
  category_id: string;
  name: string;
  release_year: number | null;
  image_url: string | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
};

export function NewModelButton({ brands, categories }: { brands: Option[]; categories: Option[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
        Ajouter un modèle
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="Nouveau modèle" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-(--shadow-float)">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Nouveau modèle</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="grid size-9 place-items-center rounded-lg hover:bg-black/5">
                <X className="size-5" />
              </button>
            </div>
            <ModelForm
              id={null}
              brands={brands}
              categories={categories}
              initial={{ brand_id: brands[0]?.id ?? "", category_id: categories[0]?.id ?? "", name: "", release_year: new Date().getFullYear(), image_url: null, is_active: true, is_popular: false, sort_order: 0 }}
              compact
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ModelForm({
  id,
  initial,
  brands,
  categories,
  compact,
}: {
  id: string | null;
  initial: ModelValues;
  brands: Option[];
  categories: Option[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof ModelValues>(key: K, value: ModelValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await saveModel(id, values);
      if (!result.ok) return void toast.error(result.error);
      toast.success(id ? "Modèle enregistré" : "Modèle ajouté");
      if (!id && result.data) router.push(`/admin/appareils/${result.data.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Marque" htmlFor="m-brand" required>
        <Select id="m-brand" value={values.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Catégorie" htmlFor="m-category" required>
        <Select id="m-category" value={values.category_id} onChange={(e) => set("category_id", e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nom du modèle (sans la marque)" htmlFor="m-name" required className="sm:col-span-2" hint="Ex. « iPhone 15 Pro », « Galaxy A55 5G », « PlayStation 5 Slim ».">
        <Input id="m-name" value={values.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
      </Field>
      <Field label="Année de sortie" htmlFor="m-year">
        <Input id="m-year" type="number" min={1990} max={2100} value={values.release_year ?? ""} onChange={(e) => set("release_year", e.target.value ? e.target.valueAsNumber : null)} />
      </Field>
      <Field label="Ordre d’affichage" htmlFor="m-order" hint="Plus petit = plus haut dans la liste.">
        <Input id="m-order" type="number" value={values.sort_order} onChange={(e) => set("sort_order", e.target.valueAsNumber || 0)} />
      </Field>
      {!compact ? <ImageUpload className="sm:col-span-2 sm:max-w-56" label="Photo (facultatif)" folder="modeles" aspect="aspect-square" value={values.image_url} onChange={(url) => set("image_url", url)} /> : null}
      <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <Switch checked={values.is_active} onChange={(v) => set("is_active", v)} label="Visible sur le site" /> Visible sur le site
        </label>
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <Switch checked={values.is_popular} onChange={(v) => set("is_popular", v)} label="Populaire" /> Populaire
        </label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending} icon={<Save className="size-4" />}>
          {id ? "Enregistrer" : "Ajouter et saisir les tarifs"}
        </Button>
      </div>
    </form>
  );
}
