"use client";

import { ExternalLink, Pencil, Plus, Save, Share2, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSocial, saveSocial } from "@/app/admin/(dashboard)/content-actions";
import { SOCIAL_PLATFORMS, SocialIcon, socialLabel } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Dialog } from "./dialog";
import { EmptyState } from "./page-header";

type Platform = Parameters<typeof saveSocial>[1]["platform"];
type Social = { id: string; platform: Platform; label: string | null; url: string; handle: string | null; is_visible: boolean; sort_order: number };

const PLACEHOLDERS: Record<string, string> = {
  instagram: "https://www.instagram.com/votrecompte",
  facebook: "https://www.facebook.com/votrepage",
  tiktok: "https://www.tiktok.com/@votrecompte",
  whatsapp: "https://wa.me/212600000000",
  snapchat: "https://www.snapchat.com/add/votrecompte",
  youtube: "https://www.youtube.com/@votrechaine",
  google: "https://maps.app.goo.gl/…",
};

export function SocialsManager({ links }: { links: Social[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Social | "new" | null>(null);
  const [values, setValues] = useState<Omit<Social, "id">>({ platform: "instagram", label: "", url: "", handle: "", is_visible: true, sort_order: 0 });
  const current = editing === "new" ? null : editing;

  const open = (s: Social | "new") => {
    setEditing(s);
    setValues(
      s === "new"
        ? { platform: "instagram", label: "", url: "", handle: "", is_visible: true, sort_order: links.length }
        : { platform: s.platform, label: s.label ?? "", url: s.url, handle: s.handle ?? "", is_visible: s.is_visible, sort_order: s.sort_order },
    );
  };

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => open("new")}>
          Ajouter un réseau
        </Button>
      </div>
      {links.length ? (
        <div className="card divide-y divide-line">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-4 px-5 py-3">
              <span className="grid size-10 place-items-center rounded-xl bg-bg" style={{ color: SOCIAL_PLATFORMS.find((p) => p.value === link.platform)?.color }}>
                <SocialIcon platform={link.platform} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {link.label || socialLabel(link.platform)} {!link.is_visible ? <Badge className="ml-2">Masqué</Badge> : null}
                </p>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-sm text-muted hover:text-ink">
                  <span className="truncate">{link.url}</span> <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>
              <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => open(link)}>
                Modifier
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Share2 className="size-5" />} title="Aucun réseau social" text="Ajoutez Instagram, Facebook, TikTok… Ils s’affichent dans le pied de page et la page Contact." />
      )}
      {editing ? (
        <Dialog title={current ? socialLabel(current.platform) : "Nouveau réseau"} onClose={() => setEditing(null)}>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await saveSocial(current?.id ?? null, values);
                if (!r.ok) return void toast.error(r.error);
                toast.success("Enregistré");
                setEditing(null);
                router.refresh();
              });
            }}
          >
            <Field label="Réseau" htmlFor="s-platform">
              <Select id="s-platform" value={values.platform} onChange={(e) => setValues({ ...values, platform: e.target.value as Platform })}>
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lien" htmlFor="s-url" required>
              <Input id="s-url" type="url" placeholder={PLACEHOLDERS[values.platform] ?? "https://"} value={values.url} onChange={(e) => setValues({ ...values, url: e.target.value })} required />
            </Field>
            <Field label="Libellé (facultatif)" htmlFor="s-label" hint="Par défaut : le nom du réseau.">
              <Input id="s-label" value={values.label ?? ""} onChange={(e) => setValues({ ...values, label: e.target.value })} />
            </Field>
            <Field label="Ordre" htmlFor="s-order">
              <Input id="s-order" type="number" value={values.sort_order} onChange={(e) => setValues({ ...values, sort_order: e.target.valueAsNumber || 0 })} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Switch checked={values.is_visible} onChange={(v) => setValues({ ...values, is_visible: v })} label="Visible" /> Visible sur le site
            </label>
            <div className="flex justify-between gap-3">
              {current ? (
                <Button
                  variant="ghost"
                  className="text-danger"
                  disabled={pending}
                  icon={<Trash className="size-4" />}
                  onClick={() =>
                    confirm("Supprimer ce lien ?") &&
                    start(async () => {
                      const r = await deleteSocial(current.id);
                      if (!r.ok) return void toast.error(r.error);
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
