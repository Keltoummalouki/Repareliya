"use client";

import { Smartphone, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteModels, updateModelFlags } from "@/app/admin/(dashboard)/appareils/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { EmptyState } from "./page-header";

type Row = {
  id: string;
  name: string;
  brand: string;
  category: string;
  release_year: number | null;
  is_active: boolean;
  is_popular: boolean;
  source: string;
  prices: number;
};

export function ModelsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<Record<string, Partial<Row>>>({});

  if (!rows.length) {
    return <EmptyState icon={<Smartphone className="size-5" />} title="Aucun modèle" text="Ajoutez un modèle ou importez-en depuis Apple et Google Play." />;
  }

  const allSelected = rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const flag = (id: string, key: "is_active" | "is_popular", value: boolean) => {
    setLocal((l) => ({ ...l, [id]: { ...l[id], [key]: value } }));
    start(async () => {
      const result = await updateModelFlags(id, { [key]: value });
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <div className="card overflow-hidden">
      {selected.size ? (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-brand-soft/50 px-4 py-2.5 text-sm">
          <span>
            <strong>{selected.size}</strong> sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            variant="danger"
            loading={pending}
            icon={<Trash className="size-4" />}
            onClick={() => {
              if (!confirm(`Supprimer ${selected.size} modèle(s) et leurs tarifs ?`)) return;
              start(async () => {
                const result = await deleteModels([...selected]);
                if (result.ok) {
                  toast.success("Modèles supprimés");
                  setSelected(new Set());
                  router.refresh();
                } else toast.error(result.error);
              });
            }}
          >
            Supprimer
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-muted">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  className="size-4 accent-brand-strong"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                />
              </th>
              <th className="px-2 py-3 font-semibold">Modèle</th>
              <th className="px-2 py-3 font-semibold">Catégorie</th>
              <th className="px-2 py-3 text-center font-semibold">Tarifs</th>
              <th className="px-2 py-3 text-center font-semibold">Populaire</th>
              <th className="px-4 py-3 text-center font-semibold">Visible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const r = { ...row, ...local[row.id] };
              return (
                <tr key={r.id} className={r.is_active ? "hover:bg-black/[0.02]" : "bg-black/[0.02] text-muted"}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" aria-label={`Sélectionner ${r.name}`} className="size-4 accent-brand-strong" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="px-2 py-2.5">
                    <Link href={`/admin/appareils/${r.id}`} className="font-semibold hover:text-brand-strong">
                      <span className="text-muted">{r.brand}</span> {r.name}
                    </Link>
                    <span className="ml-2 text-xs text-muted">{r.release_year ?? ""}</span>
                  </td>
                  <td className="px-2 py-2.5 text-muted">{r.category}</td>
                  <td className="px-2 py-2.5 text-center">
                    {r.prices ? <Badge tone="success">{r.prices}</Badge> : <Link href={`/admin/appareils/${r.id}`} className="text-xs font-semibold text-brand-strong">Ajouter</Link>}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <Switch size="sm" checked={r.is_popular} label={`Populaire : ${r.name}`} onChange={(v) => flag(r.id, "is_popular", v)} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Switch size="sm" checked={r.is_active} label={`Visible : ${r.name}`} onChange={(v) => flag(r.id, "is_active", v)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
