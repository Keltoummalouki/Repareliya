"use client";

import { Pencil, Plus, Save, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteBrand,
  deleteCategory,
  deleteRepairType,
  saveBrand,
  saveCategory,
  saveRepairType,
} from "@/app/admin/(dashboard)/appareils/actions";
import { BrandMark, CATEGORY_ICONS, CategoryIcon, REPAIR_ICONS, RepairIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { Dialog } from "./dialog";
import { ImageUpload } from "./image-upload";

type Result = { ok: boolean; error?: string };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, success: string, after?: () => void) =>
    start(async () => {
      const result = await fn();
      if (!result.ok) return void toast.error(result.error);
      toast.success(success);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

// ------------------------------------------------------------------ Marques
type Brand = { id: string; slug: string; name: string; logo_url: string | null; sort_order: number; is_featured: boolean; is_active: boolean; models: number };

export function BrandsManager({ brands }: { brands: Brand[] }) {
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const { pending, run } = useRun();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
          Ajouter une marque
        </Button>
      </div>
      <div className="card divide-y divide-line">
        {brands.map((brand) => (
          <div key={brand.id} className="flex items-center gap-4 px-5 py-3">
            <div className="w-36 shrink-0">
              <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-5" className="text-[15px]" />
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <Link href={`/admin/appareils?marque=${brand.id}`} className="font-semibold hover:text-brand-strong">
                {brand.models} modèle{brand.models > 1 ? "s" : ""}
              </Link>
              <span className="ml-3 text-muted">ordre {brand.sort_order}</span>
            </div>
            <div className="hidden gap-1.5 sm:flex">
              {brand.is_featured ? <Badge tone="brand">Accueil</Badge> : null}
              {!brand.is_active ? <Badge>Masquée</Badge> : null}
            </div>
            <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(brand)}>
              Modifier
            </Button>
          </div>
        ))}
      </div>
      {editing ? (
        <Dialog title={editing === "new" ? "Nouvelle marque" : `Marque ${editing.name}`} onClose={() => setEditing(null)}>
          <BrandForm
            brand={editing === "new" ? null : editing}
            pending={pending}
            onSave={(values) => run(() => saveBrand(editing === "new" ? null : editing.id, values), "Marque enregistrée", () => setEditing(null))}
            onDelete={
              editing !== "new"
                ? () => {
                    if (confirm(`Supprimer ${editing.name} et ses ${editing.models} modèles ?`)) run(() => deleteBrand(editing.id), "Marque supprimée", () => setEditing(null));
                  }
                : undefined
            }
          />
        </Dialog>
      ) : null}
    </>
  );
}

function BrandForm({
  brand,
  pending,
  onSave,
  onDelete,
}: {
  brand: Brand | null;
  pending: boolean;
  onSave: (values: { name: string; logo_url: string | null; sort_order: number; is_featured: boolean; is_active: boolean }) => void;
  onDelete?: () => void;
}) {
  const [values, setValues] = useState({
    name: brand?.name ?? "",
    logo_url: brand?.logo_url ?? null,
    sort_order: brand?.sort_order ?? 100,
    is_featured: brand?.is_featured ?? false,
    is_active: brand?.is_active ?? true,
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(values);
      }}
    >
      <Field label="Nom" htmlFor="b-name" required>
        <Input id="b-name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
      </Field>
      <ImageUpload className="max-w-48" label="Logo (facultatif, PNG/SVG)" folder="marques" aspect="aspect-[3/2]" value={values.logo_url} onChange={(url) => setValues({ ...values, logo_url: url })} />
      <Field label="Ordre d’affichage" htmlFor="b-order">
        <Input id="b-order" type="number" value={values.sort_order} onChange={(e) => setValues({ ...values, sort_order: e.target.valueAsNumber || 0 })} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <Switch checked={values.is_featured} onChange={(v) => setValues({ ...values, is_featured: v })} label="Afficher sur l’accueil" /> Afficher sur l’accueil
      </label>
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <Switch checked={values.is_active} onChange={(v) => setValues({ ...values, is_active: v })} label="Visible" /> Visible sur le site
      </label>
      <div className="flex justify-between gap-3 pt-2">
        {onDelete ? (
          <Button variant="ghost" className="text-danger" icon={<Trash className="size-4" />} onClick={onDelete} disabled={pending}>
            Supprimer
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={pending} icon={<Save className="size-4" />}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

// --------------------------------------------------------------- Catégories
type Category = { id: string; name: string; description: string | null; icon: string; sort_order: number; is_active: boolean; models: number };

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const { pending, run } = useRun();
  const current = editing === "new" ? null : editing;
  const [values, setValues] = useState({ name: "", description: "", icon: "smartphone", sort_order: 10, is_active: true });

  const open = (c: Category | "new") => {
    setEditing(c);
    setValues(c === "new" ? { name: "", description: "", icon: "smartphone", sort_order: categories.length + 1, is_active: true } : { name: c.name, description: c.description ?? "", icon: c.icon, sort_order: c.sort_order, is_active: c.is_active });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => open("new")}>
          Ajouter une catégorie
        </Button>
      </div>
      <div className="card divide-y divide-line">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-4 px-5 py-3">
            <span className="grid size-10 place-items-center rounded-xl bg-bg">
              <CategoryIcon icon={c.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {c.name} {!c.is_active ? <Badge className="ml-2">Masquée</Badge> : null}
              </p>
              <p className="truncate text-sm text-muted">{c.description}</p>
            </div>
            <span className="text-sm text-muted">{c.models} modèles</span>
            <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => open(c)}>
              Modifier
            </Button>
          </div>
        ))}
      </div>
      {editing ? (
        <Dialog title={current ? `Catégorie ${current.name}` : "Nouvelle catégorie"} onClose={() => setEditing(null)}>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveCategory(current?.id ?? null, values), "Catégorie enregistrée", () => setEditing(null));
            }}
          >
            <Field label="Nom" htmlFor="c-name" required>
              <Input id="c-name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
            </Field>
            <Field label="Description" htmlFor="c-desc">
              <Input id="c-desc" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
            </Field>
            <fieldset>
              <legend className="field-label">Icône</legend>
              <div className="flex flex-wrap gap-2">
                {Object.keys(CATEGORY_ICONS).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    aria-pressed={values.icon === icon}
                    onClick={() => setValues({ ...values, icon })}
                    className={`grid size-11 place-items-center rounded-xl border ${values.icon === icon ? "border-ink bg-ink text-on-fill" : "border-line-strong"}`}
                    aria-label={icon}
                  >
                    <CategoryIcon icon={icon} className="size-5" />
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Ordre" htmlFor="c-order">
              <Input id="c-order" type="number" value={values.sort_order} onChange={(e) => setValues({ ...values, sort_order: e.target.valueAsNumber || 0 })} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Switch checked={values.is_active} onChange={(v) => setValues({ ...values, is_active: v })} label="Visible" /> Visible sur le site
            </label>
            <div className="flex justify-between gap-3 pt-2">
              {current ? (
                <Button
                  variant="ghost"
                  className="text-danger"
                  icon={<Trash className="size-4" />}
                  disabled={pending}
                  onClick={() => confirm("Supprimer cette catégorie ?") && run(() => deleteCategory(current.id), "Catégorie supprimée", () => setEditing(null))}
                >
                  Supprimer
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" loading={pending} icon={<Save className="size-4" />}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}

// ------------------------------------------------------- Types de réparation
type RepairType = { id: string; name: string; description: string | null; icon: string; sort_order: number; is_active: boolean; category_ids: string[] };

export function RepairTypesManager({ types, categories }: { types: RepairType[]; categories: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<RepairType | "new" | null>(null);
  const { pending, run } = useRun();
  const current = editing === "new" ? null : editing;
  const [values, setValues] = useState({ name: "", description: "", icon: "wrench", sort_order: 0, is_active: true, category_ids: [] as string[] });

  const open = (t: RepairType | "new") => {
    setEditing(t);
    setValues(
      t === "new"
        ? { name: "", description: "", icon: "wrench", sort_order: types.length + 1, is_active: true, category_ids: [] }
        : { name: t.name, description: t.description ?? "", icon: t.icon, sort_order: t.sort_order, is_active: t.is_active, category_ids: t.category_ids },
    );
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => open("new")}>
          Ajouter un type de réparation
        </Button>
      </div>
      <div className="card divide-y divide-line">
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-4 px-5 py-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-strong">
              <RepairIcon icon={t.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {t.name} {!t.is_active ? <Badge className="ml-2">Masqué</Badge> : null}
              </p>
              <p className="truncate text-sm text-muted">
                {t.category_ids.length ? t.category_ids.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean).join(", ") : "Toutes catégories"}
              </p>
            </div>
            <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => open(t)}>
              Modifier
            </Button>
          </div>
        ))}
      </div>
      {editing ? (
        <Dialog title={current ? current.name : "Nouveau type de réparation"} onClose={() => setEditing(null)}>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveRepairType(current?.id ?? null, values), "Enregistré", () => setEditing(null));
            }}
          >
            <Field label="Nom" htmlFor="r-name" required>
              <Input id="r-name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
            </Field>
            <Field label="Description (affichée sur le site)" htmlFor="r-desc">
              <Textarea id="r-desc" rows={2} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
            </Field>
            <fieldset>
              <legend className="field-label">Icône</legend>
              <div className="flex flex-wrap gap-2">
                {Object.keys(REPAIR_ICONS).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    aria-pressed={values.icon === icon}
                    aria-label={icon}
                    onClick={() => setValues({ ...values, icon })}
                    className={`grid size-10 place-items-center rounded-xl border ${values.icon === icon ? "border-ink bg-ink text-on-fill" : "border-line-strong"}`}
                  >
                    <RepairIcon icon={icon} className="size-4.5" />
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Concerne</legend>
              <p className="field-hint mb-2 !mt-0">Aucune case cochée = tous les appareils.</p>
              <div className="flex flex-wrap gap-3">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-strong"
                      checked={values.category_ids.includes(c.id)}
                      onChange={(e) =>
                        setValues({ ...values, category_ids: e.target.checked ? [...values.category_ids, c.id] : values.category_ids.filter((id) => id !== c.id) })
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Ordre" htmlFor="r-order">
              <Input id="r-order" type="number" value={values.sort_order} onChange={(e) => setValues({ ...values, sort_order: e.target.valueAsNumber || 0 })} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Switch checked={values.is_active} onChange={(v) => setValues({ ...values, is_active: v })} label="Actif" /> Actif
            </label>
            <div className="flex justify-between gap-3 pt-2">
              {current ? (
                <Button
                  variant="ghost"
                  className="text-danger"
                  icon={<Trash className="size-4" />}
                  disabled={pending}
                  onClick={() => confirm("Supprimer ce type et tous les tarifs associés ?") && run(() => deleteRepairType(current.id), "Supprimé", () => setEditing(null))}
                >
                  Supprimer
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" loading={pending} icon={<Save className="size-4" />}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
