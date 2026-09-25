"use client";

import { GripVertical, LoaderCircle, Plus, Save, Search, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveDocument, type DocumentPayload } from "@/app/admin/(dashboard)/documents/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { computeTotals, type DocumentItem } from "@/lib/documents";
import { formatAmount } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type EditorValues = Omit<DocumentPayload, "items"> & { items: (DocumentItem & { key: string })[] };

let keySeed = 0;
const newKey = () => `l${++keySeed}`;

export function DocumentEditor({ id, initial, aside }: { id: string | null; initial: DocumentPayload; aside?: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [values, setValues] = useState<EditorValues>(() => ({
    ...initial,
    items: (initial.items.length ? initial.items : [{ description: "", quantity: 1, unit_price: 0 }]).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      key: newKey(),
    })),
  }));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof EditorValues>(key: K, value: EditorValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };
  const setItem = (key: string, patch: Partial<DocumentItem>) =>
    set(
      "items",
      values.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  const addItem = (item?: DocumentItem) =>
    set("items", [...values.items.filter((i) => i.description.trim() || i.unit_price), { ...(item ?? { description: "", quantity: 1, unit_price: 0 }), key: newKey() }]);

  const totals = useMemo(
    () => computeTotals(values.items.map((i) => ({ ...i, quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0 })), Number(values.tax_rate) || 0, values.prices_include_tax),
    [values.items, values.tax_rate, values.prices_include_tax],
  );
  const currency = values.currency;
  const isDevis = values.type === "devis";

  function save() {
    const items = values.items
      .filter((i) => i.description.trim())
      .map(({ key: _key, ...item }) => ({ ...item, quantity: Number(item.quantity) || 1, unit_price: Number(item.unit_price) || 0 }));
    start(async () => {
      const result = await saveDocument(id, { ...values, items });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDirty(false);
      toast.success(id ? "Modifications enregistrées" : `${isDevis ? "Devis" : "Facture"} créé${isDevis ? "" : "e"}`);
      if (!id && result.data) router.replace(`/admin/documents/${result.data.id}`);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="text-[15px] font-bold">Client</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nom du client" htmlFor="customer_name" required className="sm:col-span-2">
              <Input id="customer_name" value={values.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
            </Field>
            <Field label="Contact préféré" htmlFor="preferred_contact">
              <Select
                id="preferred_contact"
                value={values.preferred_contact ?? ""}
                onChange={(e) => set("preferred_contact", (e.target.value || null) as EditorValues["preferred_contact"])}
              >
                <option value="">Non précisé</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telephone">Téléphone</option>
                <option value="email">E-mail</option>
              </Select>
            </Field>
            <Field label="Téléphone" htmlFor="customer_phone">
              <Input id="customer_phone" type="tel" value={values.customer_phone ?? ""} onChange={(e) => set("customer_phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp" htmlFor="customer_whatsapp">
              <Input id="customer_whatsapp" type="tel" value={values.customer_whatsapp ?? ""} onChange={(e) => set("customer_whatsapp", e.target.value)} />
            </Field>
            <Field label="E-mail" htmlFor="customer_email">
              <Input id="customer_email" type="email" value={values.customer_email ?? ""} onChange={(e) => set("customer_email", e.target.value)} />
            </Field>
            <Field label="Adresse (facultatif)" htmlFor="customer_address" className="sm:col-span-2">
              <Input id="customer_address" value={values.customer_address ?? ""} onChange={(e) => set("customer_address", e.target.value)} />
            </Field>
            <Field label="Appareil" htmlFor="device_label" className="sm:col-span-2">
              <Input id="device_label" placeholder="Ex. Apple iPhone 13 — IMEI 35…" value={values.device_label ?? ""} onChange={(e) => set("device_label", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-bold">Prestations</h2>
            <span className="text-xs text-muted">Prix {values.prices_include_tax ? "TTC" : "HT"} · remise = montant négatif</span>
          </div>
          <div className="hidden grid-cols-[20px_1fr_80px_120px_110px_36px] gap-2 px-5 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted md:grid">
            <span />
            <span>Désignation</span>
            <span className="text-right">Qté</span>
            <span className="text-right">Prix unitaire</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          <ul className="divide-y divide-line md:divide-y-0">
            {values.items.map((item, index) => (
              <li key={item.key} className="grid grid-cols-[1fr_80px_110px_36px] items-center gap-2 px-5 py-3 md:grid-cols-[20px_1fr_80px_120px_110px_36px] md:py-2">
                <GripVertical className="hidden size-4 text-line-strong md:block" aria-hidden />
                <Input
                  className="col-span-4 md:col-span-1"
                  aria-label={`Désignation ligne ${index + 1}`}
                  placeholder="Ex. Remplacement écran iPhone 13 (qualité origine)"
                  value={item.description}
                  onChange={(e) => setItem(item.key, { description: e.target.value })}
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  className="text-right"
                  aria-label={`Quantité ligne ${index + 1}`}
                  value={Number.isNaN(item.quantity) ? "" : item.quantity}
                  onChange={(e) => setItem(item.key, { quantity: e.target.valueAsNumber })}
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="text-right"
                  aria-label={`Prix unitaire ligne ${index + 1}`}
                  value={Number.isNaN(item.unit_price) ? "" : item.unit_price}
                  onChange={(e) => setItem(item.key, { unit_price: e.target.valueAsNumber })}
                />
                <span className="hidden text-right text-sm font-semibold md:block">
                  {formatAmount((Number(item.quantity) || 0) * (Number(item.unit_price) || 0), currency)}
                </span>
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={`Supprimer la ligne ${index + 1}`}
                  onClick={() => set("items", values.items.filter((i) => i.key !== item.key))}
                >
                  <Trash className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4 border-t border-line p-5">
            <Button variant="outline" size="sm" className="self-start" icon={<Plus className="size-4" />} onClick={() => addItem()}>
              Ajouter une ligne
            </Button>
            <CatalogPicker onPick={(item) => addItem(item)} />
          </div>
        </section>

        <section className="card grid gap-4 p-5">
          <Field label="Remarques (visibles par le client)" htmlFor="notes">
            <Textarea id="notes" rows={3} value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <Field label={isDevis ? "Conditions du devis" : "Conditions de paiement"} htmlFor="terms">
            <Textarea id="terms" rows={3} value={values.terms ?? ""} onChange={(e) => set("terms", e.target.value)} />
          </Field>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        {aside}
        <section className="card space-y-4 p-5">
          <Field label="Date" htmlFor="issue_date">
            <DatePicker id="issue_date" value={values.issue_date} onChange={(e) => set("issue_date", e.target.value)} required />
          </Field>
          {isDevis ? (
            <Field label="Valable jusqu’au" htmlFor="valid_until">
              <DatePicker id="valid_until" value={values.valid_until ?? ""} onChange={(e) => set("valid_until", e.target.value || null)} />
            </Field>
          ) : (
            <Field label="Échéance (facultatif)" htmlFor="due_date">
              <DatePicker id="due_date" value={values.due_date ?? ""} onChange={(e) => set("due_date", e.target.value || null)} />
            </Field>
          )}
          <Field label="TVA (%)" htmlFor="tax_rate" hint="0 si vous n’êtes pas assujetti à la TVA.">
            <Input id="tax_rate" type="number" min="0" max="100" step="0.1" value={values.tax_rate} onChange={(e) => set("tax_rate", e.target.valueAsNumber || 0)} />
          </Field>
          {Number(values.tax_rate) > 0 ? (
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Prix saisis TTC
              <Switch checked={values.prices_include_tax} onChange={(v) => set("prices_include_tax", v)} label="Prix saisis TTC" />
            </label>
          ) : null}
        </section>
        <section className="card p-5">
          <dl className="space-y-2 text-sm">
            {Number(values.tax_rate) > 0 ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted">Total HT</dt>
                  <dd>{formatAmount(totals.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">TVA {values.tax_rate} %</dt>
                  <dd>{formatAmount(totals.tax, currency)}</dd>
                </div>
              </>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-bold">{Number(values.tax_rate) > 0 ? "Total TTC" : "Total"}</dt>
              <dd className="font-display text-2xl font-extrabold">{formatAmount(totals.total, currency)}</dd>
            </div>
          </dl>
          <Button className="mt-5 w-full" size="lg" loading={pending} icon={<Save className="size-4" />} onClick={save}>
            {id ? "Enregistrer" : `Créer ${isDevis ? "le devis" : "la facture"}`}
          </Button>
          {dirty ? <p className="mt-2 text-center text-xs text-warning">Modifications non enregistrées</p> : null}
        </section>
      </aside>
    </div>
  );
}

type SearchModel = { id: string; name: string; brand: string };
type ModelPrice = { id: string; price: number | null; quality: string; repair: string };

function CatalogPicker({ onPick }: { onPick: (item: DocumentItem) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchModel[]>([]);
  const [model, setModel] = useState<SearchModel | null>(null);
  const [prices, setPrices] = useState<ModelPrice[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      // Les mots qui correspondent à une marque filtrent par marque, les autres par nom de modèle
      const { data: brands } = await supabase.from("brands").select("id, name");
      const brandTerms = terms.filter((t) => (brands ?? []).some((b) => b.name.toLowerCase().startsWith(t)));
      const brandIds = (brands ?? []).filter((b) => brandTerms.some((t) => b.name.toLowerCase().startsWith(t))).map((b) => b.id);
      const nameTerm = terms.filter((t) => !brandTerms.includes(t)).sort((a, b) => b.length - a.length)[0]?.replace(/[%,()]/g, "");
      let request = supabase.from("device_models").select("id, name, brands!inner(name)").order("sort_order").limit(80);
      if (brandIds.length) request = request.in("brand_id", brandIds);
      if (nameTerm) request = request.ilike("name", `%${nameTerm}%`);
      const { data } = await request;
      const found = (data ?? [])
        .map((m) => ({ id: m.id, name: m.name, brand: m.brands.name }))
        .filter((m) => terms.every((t) => `${m.brand} ${m.name}`.toLowerCase().includes(t)))
        .slice(0, 12);
      setResults(found);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function choose(m: SearchModel) {
    setModel(m);
    setPrices(null);
    const { data } = await createClient()
      .from("repair_prices")
      .select("id, price, quality, repair_types(name, sort_order)")
      .eq("model_id", m.id)
      .order("sort_order");
    setPrices(
      (data ?? [])
        .map((p) => ({ id: p.id, price: p.price === null ? null : Number(p.price), quality: p.quality, repair: p.repair_types?.name ?? "" }))
        .sort((a, b) => a.repair.localeCompare(b.repair)),
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-bg p-4">
      <p className="text-sm font-semibold">Ajouter depuis le catalogue</p>
      <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3">
        <Search className="size-4 text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setModel(null);
            if (!e.target.value.trim()) setResults([]);
          }}
          placeholder="Rechercher un modèle : iphone 13, galaxy a54…"
          className="h-10 w-full bg-transparent text-sm outline-none"
          aria-label="Rechercher un modèle du catalogue"
        />
        {loading ? <LoaderCircle className="size-4 animate-spin text-muted" /> : null}
      </div>
      {!model && results.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {results.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => choose(m)} className="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm hover:border-ink">
                {m.brand} {m.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {model ? (
        <div className="mt-3">
          <p className="text-sm">
            <strong>
              {model.brand} {model.name}
            </strong>{" "}
            — cliquez pour ajouter :
          </p>
          {prices === null ? (
            <p className="mt-2 text-sm text-muted">Chargement…</p>
          ) : prices.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {prices.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="rounded-full bg-ink px-3 py-1 text-sm text-on-fill hover:bg-ink-soft"
                    onClick={() =>
                      onPick({
                        description: `${p.repair} ${model.brand} ${model.name}${p.quality ? ` (${p.quality})` : ""}`,
                        quantity: 1,
                        unit_price: p.price ?? 0,
                      })
                    }
                  >
                    {p.repair}
                    {p.quality ? ` · ${p.quality}` : ""} {p.price !== null ? `· ${p.price}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Aucun tarif enregistré pour ce modèle. Ajoutez une ligne libre.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
