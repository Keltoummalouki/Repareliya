"use client";

import { Images, Pencil, Plus, Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteRealisation, saveRealisation } from "@/app/admin/(dashboard)/content-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker, localDateValue } from "@/components/ui/date-picker";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { formatDate } from "@/lib/format";
import { Dialog } from "./dialog";
import { ImageUpload, MultiImageUpload } from "./image-upload";
import { EmptyState } from "./page-header";

type Item = {
  id: string;
  title: string;
  description: string | null;
  device_label: string | null;
  repair_label: string | null;
  category_id: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  images: string[];
  performed_on: string | null;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
};

const empty: Omit<Item, "id"> = {
  title: "",
  description: null,
  device_label: null,
  repair_label: null,
  category_id: null,
  before_image_url: null,
  after_image_url: null,
  images: [],
  performed_on: null,
  is_published: true,
  is_featured: false,
  sort_order: 0,
};

export function RealisationsManager({ items, categories }: { items: Item[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [values, setValues] = useState<Omit<Item, "id">>(empty);
  const [pending, start] = useTransition();
  const current = editing === "new" ? null : editing;
  const set = <K extends keyof typeof values>(k: K, v: (typeof values)[K]) => setValues((s) => ({ ...s, [k]: v }));

  const open = (item: Item | "new") => {
    setEditing(item);
    setValues(item === "new" ? { ...empty, performed_on: localDateValue() } : { ...item });
  };

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => open("new")}>
          Ajouter une réalisation
        </Button>
      </div>
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const cover = item.after_image_url ?? item.images[0] ?? item.before_image_url;
            return (
              <button key={item.id} type="button" onClick={() => open(item)} className="card group overflow-hidden text-left transition-colors hover:border-ink">
                <div className="relative aspect-[4/3] bg-bg">
                  {cover ? <img src={cover} alt="" className="size-full object-cover" /> : null}
                  <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-surface/90 opacity-0 transition-opacity group-hover:opacity-100">
                    <Pencil className="size-4" />
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {item.performed_on ? formatDate(item.performed_on, { month: "short", year: "numeric" }) : null}
                    {!item.is_published ? <Badge>Masquée</Badge> : null}
                    {item.is_featured ? <Badge tone="brand">En avant</Badge> : null}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Images className="size-5" />} title="Aucune réalisation" text="Publiez vos plus belles réparations, avec photos avant / après." />
      )}

      {editing ? (
        <Dialog title={current ? current.title : "Nouvelle réalisation"} onClose={() => setEditing(null)} wide>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const result = await saveRealisation(current?.id ?? null, values);
                if (!result.ok) return void toast.error(result.error);
                toast.success("Réalisation enregistrée");
                setEditing(null);
                router.refresh();
              });
            }}
          >
            <Field label="Titre" htmlFor="r-title" required>
              <Input id="r-title" placeholder="Ex. Remplacement d’écran OLED sur iPhone 14 Pro" value={values.title} onChange={(e) => set("title", e.target.value)} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUpload label="Photo avant" folder="realisations" value={values.before_image_url} onChange={(url) => set("before_image_url", url)} />
              <ImageUpload label="Photo après" folder="realisations" value={values.after_image_url} onChange={(url) => set("after_image_url", url)} />
            </div>
            <MultiImageUpload label="Autres photos (facultatif)" folder="realisations" value={values.images} onChange={(urls) => set("images", urls)} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Appareil" htmlFor="r-device">
                <Input id="r-device" placeholder="iPhone 14 Pro" value={values.device_label ?? ""} onChange={(e) => set("device_label", e.target.value)} />
              </Field>
              <Field label="Réparation" htmlFor="r-repair">
                <Input id="r-repair" placeholder="Écran" value={values.repair_label ?? ""} onChange={(e) => set("repair_label", e.target.value)} />
              </Field>
              <Field label="Catégorie" htmlFor="r-cat">
                <Select id="r-cat" value={values.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Description" htmlFor="r-desc">
              <Textarea id="r-desc" rows={3} value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Date" htmlFor="r-date">
                <DatePicker id="r-date" value={values.performed_on ?? ""} onChange={(e) => set("performed_on", e.target.value || null)} />
              </Field>
              <Field label="Ordre" htmlFor="r-order">
                <Input id="r-order" type="number" value={values.sort_order} onChange={(e) => set("sort_order", e.target.valueAsNumber || 0)} />
              </Field>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2.5 text-sm font-medium">
                  <Switch checked={values.is_published} onChange={(v) => set("is_published", v)} label="Publiée" /> Publiée
                </label>
                <label className="flex items-center gap-2.5 text-sm font-medium">
                  <Switch checked={values.is_featured} onChange={(v) => set("is_featured", v)} label="Mise en avant" /> Mise en avant
                </label>
              </div>
            </div>
            <div className="flex justify-between gap-3">
              {current ? (
                <Button
                  variant="ghost"
                  className="text-danger"
                  icon={<Trash className="size-4" />}
                  disabled={pending}
                  onClick={() =>
                    confirm("Supprimer cette réalisation ?") &&
                    start(async () => {
                      const r = await deleteRealisation(current.id);
                      if (!r.ok) return void toast.error(r.error);
                      toast.success("Supprimée");
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
