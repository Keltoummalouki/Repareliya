"use client";

import clsx from "clsx";
import { Copy, Plus, Save, Star, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { copyPrices, savePrices, type PriceInput } from "@/app/admin/(dashboard)/appareils/actions";
import { RepairIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

type RepairType = { id: string; name: string; icon: string };
type Row = PriceInput & { key: string };

let seed = 0;
const key = () => `p${++seed}`;

export function PriceEditor({
  modelId,
  repairTypes,
  initial,
  currency,
  copySources,
}: {
  modelId: string;
  repairTypes: RepairType[];
  initial: PriceInput[];
  currency: string;
  copySources: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [rows, setRows] = useState<Row[]>(() => {
    const list: Row[] = initial.map((p) => ({ ...p, key: key() }));
    for (const type of repairTypes) {
      if (!list.some((r) => r.repair_type_id === type.id)) {
        list.push({ key: key(), repair_type_id: type.id, quality: "", price: null, price_is_from: false, duration: "", note: "", is_active: true, is_featured: false });
      }
    }
    return list;
  });

  const update = (k: string, patch: Partial<Row>) => {
    setRows((list) => list.map((r) => (r.key === k ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  function save() {
    start(async () => {
      const result = await savePrices(
        modelId,
        rows.map(({ key: _k, ...r }) => r),
      );
      if (result.ok) {
        toast.success("Tarifs enregistrés");
        setDirty(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  const priced = rows.filter((r) => r.price !== null).length;

  return (
    <section className="card">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-bold">Tarifs ({currency})</h2>
          <p className="text-xs text-muted">
            {priced} tarif{priced > 1 ? "s" : ""} renseigné{priced > 1 ? "s" : ""}. Laissez vide pour afficher « Sur devis ». ★ = mis en avant sur l’accueil.
          </p>
        </div>
        <Button loading={pending} icon={<Save className="size-4" />} onClick={save} variant={dirty ? "primary" : "outline"}>
          Enregistrer les tarifs
        </Button>
      </div>

      <div className="hidden grid-cols-[minmax(160px,1.2fr)_minmax(110px,1fr)_120px_60px_100px_36px_36px] gap-2 px-5 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted lg:grid">
        <span>Réparation</span>
        <span>Qualité / variante</span>
        <span className="text-right">Prix</span>
        <span className="text-center">« dès »</span>
        <span>Durée</span>
        <span />
        <span />
      </div>

      <ul className="divide-y divide-line">
        {repairTypes.map((type) => {
          const typeRows = rows.filter((r) => r.repair_type_id === type.id);
          return (
            <li key={type.id} className="px-5 py-3">
              {typeRows.map((row, index) => (
                <div
                  key={row.key}
                  className="grid grid-cols-2 items-center gap-2 py-1 lg:grid-cols-[minmax(160px,1.2fr)_minmax(110px,1fr)_120px_60px_100px_36px_36px]"
                >
                  <span className={clsx("col-span-2 flex items-center gap-2 text-sm font-semibold lg:col-span-1", index > 0 && "lg:invisible")}>
                    <RepairIcon icon={type.icon} className="size-4 text-brand-strong" />
                    {type.name}
                  </span>
                  <input
                    className="field-input h-10 min-h-0 py-1.5 text-sm"
                    placeholder={index === 0 ? "Standard" : "Ex. Original"}
                    aria-label={`Qualité ${type.name}`}
                    value={row.quality ?? ""}
                    onChange={(e) => update(row.key, { quality: e.target.value })}
                  />
                  <input
                    className="field-input h-10 min-h-0 py-1.5 text-right text-sm font-semibold"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Sur devis"
                    aria-label={`Prix ${type.name} ${row.quality ?? ""}`}
                    value={row.price ?? ""}
                    onChange={(e) => update(row.key, { price: e.target.value === "" ? null : e.target.valueAsNumber })}
                  />
                  <label className="flex items-center justify-center gap-1.5 text-xs text-muted lg:justify-center">
                    <input type="checkbox" className="size-4 accent-brand-strong" checked={row.price_is_from ?? false} onChange={(e) => update(row.key, { price_is_from: e.target.checked })} />
                    <span className="lg:sr-only">à partir de</span>
                  </label>
                  <input
                    className="field-input h-10 min-h-0 py-1.5 text-sm"
                    placeholder="Ex. 1 h"
                    aria-label={`Durée ${type.name}`}
                    value={row.duration ?? ""}
                    onChange={(e) => update(row.key, { duration: e.target.value })}
                  />
                  <button
                    type="button"
                    className={clsx("grid size-9 place-items-center rounded-lg", row.is_featured ? "text-[#f5a524]" : "text-line-strong hover:text-muted")}
                    aria-label="Mettre en avant sur l’accueil"
                    aria-pressed={row.is_featured ?? false}
                    onClick={() => update(row.key, { is_featured: !row.is_featured })}
                  >
                    <Star className={clsx("size-4", row.is_featured && "fill-current")} />
                  </button>
                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                    aria-label="Retirer cette ligne"
                    onClick={() => {
                      setRows((list) => {
                        const remaining = list.filter((r) => r.key !== row.key);
                        return remaining.some((r) => r.repair_type_id === type.id)
                          ? remaining
                          : [...remaining, { key: key(), repair_type_id: type.id, quality: "", price: null, price_is_from: false, duration: "", note: "", is_active: true, is_featured: false }];
                      });
                      setDirty(true);
                    }}
                  >
                    <Trash className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                onClick={() => {
                  setRows((list) => [...list, { key: key(), repair_type_id: type.id, quality: "", price: null, price_is_from: false, duration: "", note: "", is_active: true, is_featured: false }]);
                  setDirty(true);
                }}
              >
                <Plus className="size-3.5" /> Ajouter une qualité (ex. Original / Compatible)
              </button>
            </li>
          );
        })}
      </ul>

      {copySources.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-bg px-5 py-4">
          <span className="text-sm font-medium">Copier les tarifs depuis</span>
          <Select className="h-9 min-h-0 w-auto py-1 text-sm" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} aria-label="Modèle source">
            <option value="">Choisir un modèle…</option>
            {copySources.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!copyFrom || pending}
            icon={<Copy className="size-4" />}
            onClick={() =>
              start(async () => {
                const result = await copyPrices(copyFrom, modelId);
                if (result.ok) {
                  toast.success("Tarifs copiés");
                  router.refresh();
                  setTimeout(() => window.location.reload(), 300);
                } else toast.error(result.error);
              })
            }
          >
            Copier
          </Button>
        </div>
      ) : null}
    </section>
  );
}
