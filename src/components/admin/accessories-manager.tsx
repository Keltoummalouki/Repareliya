"use client";

import { Package, Pencil, Plus, Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAccessory, saveAccessory } from "@/app/admin/(dashboard)/content-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { formatMoney } from "@/lib/format";
import { Dialog } from "./dialog";
import { ImageUpload } from "./image-upload";
import { EmptyState } from "./page-header";

type Accessory = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  compare_at_price: number | null;
  image_url: string | null;
  compatible_with: string | null;
  stock_status: "en_stock" | "sur_commande" | "rupture";
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
};

const SUGGESTED = ["Coques", "Protections d’écran", "Chargeurs", "Câbles", "Écouteurs", "Batteries externes", "Supports", "Cartes mémoire", "Manettes"];
const STOCK = { en_stock: "En stock", sur_commande: "Sur commande", rupture: "Épuisé" } as const;

const empty: Omit<Accessory, "id"> = {
  name: "",
  category: "Coques",
  description: null,
  price: null,
  compare_at_price: null,
  image_url: null,
  compatible_with: null,
  stock_status: "en_stock",
  is_published: true,
  is_featured: false,
  sort_order: 0,
};

export function AccessoriesManager({ items, currency }: { items: Accessory[]; currency: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Accessory | "new" | null>(null);
  const [values, setValues] = useState<Omit<Accessory, "id">>(empty);
  const [pending, start] = useTransition();
  const categories = [...new Set([...SUGGESTED, ...items.map((i) => i.category)])];
  const current = editing === "new" ? null : editing;

  const open = (item: Accessory | "new") => {
    setEditing(item);
    setValues(item === "new" ? empty : { ...item });
  };
  const set = <K extends keyof typeof values>(k: K, v: (typeof values)[K]) => setValues((s) => ({ ...s, [k]: v }));

  const save = () =>
    start(async () => {
      const result = await saveAccessory(current?.id ?? null, values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Accessoire enregistré");
      setEditing(null);
      router.refresh();
    });

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => open("new")}>
          Ajouter un accessoire
        </Button>
      </div>
      {items.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => open(item)} className="card group overflow-hidden text-left transition-colors hover:border-ink">
              <div className="relative aspect-square bg-bg">
                {item.image_url ? <img src={item.image_url} alt="" className="size-full object-cover" /> : <Package className="absolute inset-0 m-auto size-8 text-line-strong" />}
                <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-surface/90 opacity-0 transition-opacity group-hover:opacity-100">
                  <Pencil className="size-4" />
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted">{item.category}</p>
                <p className="font-semibold leading-snug">{item.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="font-bold">{item.price !== null ? formatMoney(item.price, currency) : "—"}</span>
                  {!item.is_published ? <Badge>Masqué</Badge> : null}
                  {item.stock_status !== "en_stock" ? <Badge tone="warning">{STOCK[item.stock_status]}</Badge> : null}
                  {item.is_featured ? <Badge tone="brand">Accueil</Badge> : null}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Package className="size-5" />} title="Aucun accessoire" text="Ajoutez vos coques, protections, chargeurs… Ils apparaîtront dans la boutique du site." />
      )}

      {editing ? (
        <Dialog title={current ? current.name : "Nouvel accessoire"} onClose={() => setEditing(null)} wide>
          <form
            className="grid gap-4 sm:grid-cols-[220px_1fr]"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <ImageUpload label="Photo" folder="accessoires" aspect="aspect-square" value={values.image_url} onChange={(url) => set("image_url", url)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" htmlFor="a-name" required className="sm:col-span-2">
                <Input id="a-name" value={values.name} onChange={(e) => set("name", e.target.value)} required />
              </Field>
              <Field label="Catégorie" htmlFor="a-cat" required>
                <Input id="a-cat" list="a-cats" value={values.category} onChange={(e) => set("category", e.target.value)} required />
                <datalist id="a-cats">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Stock" htmlFor="a-stock">
                <Select id="a-stock" value={values.stock_status} onChange={(e) => set("stock_status", e.target.value as Accessory["stock_status"])}>
                  {Object.entries(STOCK).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Prix (${currency})`} htmlFor="a-price">
                <Input id="a-price" type="number" min={0} step="0.01" value={values.price ?? ""} onChange={(e) => set("price", e.target.value === "" ? null : e.target.valueAsNumber)} />
              </Field>
              <Field label="Prix barré (facultatif)" htmlFor="a-compare">
                <Input id="a-compare" type="number" min={0} step="0.01" value={values.compare_at_price ?? ""} onChange={(e) => set("compare_at_price", e.target.value === "" ? null : e.target.valueAsNumber)} />
              </Field>
              <Field label="Compatible avec" htmlFor="a-compat" className="sm:col-span-2">
                <Input id="a-compat" placeholder="Ex. iPhone 15 / 15 Pro" value={values.compatible_with ?? ""} onChange={(e) => set("compatible_with", e.target.value)} />
              </Field>
              <Field label="Description" htmlFor="a-desc" className="sm:col-span-2">
                <Textarea id="a-desc" rows={3} value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Ordre" htmlFor="a-order">
                <Input id="a-order" type="number" value={values.sort_order} onChange={(e) => set("sort_order", e.target.valueAsNumber || 0)} />
              </Field>
              <div className="flex flex-col justify-end gap-2.5">
                <label className="flex items-center gap-2.5 text-sm font-medium">
                  <Switch checked={values.is_published} onChange={(v) => set("is_published", v)} label="Publié" /> Publié
                </label>
                <label className="flex items-center gap-2.5 text-sm font-medium">
                  <Switch checked={values.is_featured} onChange={(v) => set("is_featured", v)} label="Mis en avant" /> Mis en avant
                </label>
              </div>
            </div>
            <div className="flex justify-between gap-3 sm:col-span-2">
              {current ? (
                <Button
                  variant="ghost"
                  className="text-danger"
                  icon={<Trash className="size-4" />}
                  disabled={pending}
                  onClick={() =>
                    confirm("Supprimer cet accessoire ?") &&
                    start(async () => {
                      const r = await deleteAccessory(current.id);
                      if (!r.ok) return void toast.error(r.error);
                      toast.success("Supprimé");
                      setEditing(null);
                      router.refresh();
                    })
                  }
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
