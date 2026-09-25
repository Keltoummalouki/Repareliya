"use client";

import clsx from "clsx";
import { ArrowRight, Camera, CheckCircle2, ImagePlus, Mail, PencilLine, Phone, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitRequest, type SubmitRequestState } from "@/app/(site)/devis/actions";
import { RepairIcon, WhatsappIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { formatMoney, formatPhone } from "@/lib/format";
import { compressImage } from "@/lib/image-compress";
import type { ContactMethod } from "@/lib/contact";
import {
  loadBrands,
  loadModels,
  loadPrices,
  useAsync,
  type PickerBrand,
  type PickerCategory,
  type PickerModel,
  type PickerRepairType,
} from "./catalog-client";
import { BrandChooser, CategoryTabs, ModelSearch } from "./device-picker";

type InitialModel = { id: string; name: string; brand_id: string; brand_name: string; brand_slug: string; category_id: string } | null;

const METHODS: { value: ContactMethod; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "whatsapp", label: "WhatsApp", hint: "Réponse la plus rapide", icon: <WhatsappIcon className="size-5" /> },
  { value: "telephone", label: "Téléphone", hint: "Appel ou SMS", icon: <Phone className="size-5" /> },
  { value: "email", label: "E-mail", hint: "Devis PDF par e-mail", icon: <Mail className="size-5" /> },
];

export function DevisForm({
  categories,
  repairTypes,
  currency,
  country,
  initialModel,
  initialRepairIds = [],
  accessory,
  kind = "devis",
}: {
  categories: PickerCategory[];
  repairTypes: PickerRepairType[];
  currency: string;
  country: string;
  initialModel?: InitialModel;
  initialRepairIds?: string[];
  accessory?: { id: string; name: string; price: number | null } | null;
  kind?: "devis" | "contact" | "accessoire";
}) {
  const [state, dispatch, pending] = useActionState<SubmitRequestState, FormData>(submitRequest, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const [startedAt] = useState(() => Date.now());

  // Appareil
  const [categoryId, setCategoryId] = useState<string | null>(initialModel?.category_id ?? null);
  const [brand, setBrand] = useState<Pick<PickerBrand, "brand_id" | "name" | "slug"> | null>(
    initialModel ? { brand_id: initialModel.brand_id, name: initialModel.brand_name, slug: initialModel.brand_slug } : null,
  );
  const [model, setModel] = useState<Pick<PickerModel, "id" | "name"> | null>(initialModel ? { id: initialModel.id, name: initialModel.name } : null);
  const [editingDevice, setEditingDevice] = useState(!initialModel);
  const [otherDevice, setOtherDevice] = useState(false);
  const [repairs, setRepairs] = useState<string[]>(initialRepairIds);

  // Contact
  const [method, setMethod] = useState<ContactMethod | null>(null);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);

  const brands = useAsync(kind === "devis" && categoryId && editingDevice ? `b:${categoryId}` : null, () => loadBrands(categoryId!));
  const models = useAsync(
    kind === "devis" && brand && categoryId && editingDevice ? `m:${brand.brand_id}:${categoryId}` : null,
    () => loadModels(brand!.brand_id, categoryId!),
  );
  const prices = useAsync(model ? `p:${model.id}` : null, () => loadPrices(model!.id));

  const availableRepairs = useMemo(
    () => repairTypes.filter((r) => !categoryId || !r.category_ids.length || r.category_ids.includes(categoryId)),
    [repairTypes, categoryId],
  );

  const priceFor = (repairId: string) => {
    const values = (prices.data ?? []).filter((p) => p.repair_type_id === repairId && p.price !== null).map((p) => p.price!);
    return values.length ? Math.min(...values) : null;
  };
  const selectedPrices = repairs.map(priceFor);
  const estimate = repairs.length && selectedPrices.every((p) => p !== null) ? selectedPrices.reduce<number>((a, b) => a + (b ?? 0), 0) : null;

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  useEffect(() => {
    if (state.status === "success") window.scrollTo({ top: 0, behavior: "smooth" });
    if (state.status === "error") {
      const firstError = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      firstError?.focus();
    }
  }, [state]);

  const errors = state.status === "error" ? state.fieldErrors ?? {} : {};

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.delete("photos");
    for (const photo of photos) formData.append("photos", await compressImage(photo.file));
    startTransition(() => dispatch(formData));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= 3) break;
      if (!file.type.startsWith("image/")) continue;
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  if (state.status === "success") {
    const how =
      state.method === "email"
        ? `par e-mail à ${state.contactValue}`
        : state.method === "whatsapp"
          ? `sur WhatsApp au ${formatPhone(state.contactValue, country)}`
          : `par téléphone au ${formatPhone(state.contactValue, country)}`;
    return (
      <div className="card p-8 text-center sm:p-12" role="status">
        <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden />
        <h2 className="mt-5 text-3xl font-bold">Demande envoyée !</h2>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted">Référence #{state.number}</p>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-ink-soft">
          Merci ! Nous étudions votre demande et vous répondons {how}. Gardez votre référence à portée de main.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="outline">Retour à l’accueil</ButtonLink>
          <ButtonLink href="/tarifs">Voir les tarifs</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="card divide-y divide-line">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="started_at" value={startedAt} />
      <input type="hidden" name="source_page" value={kind === "accessoire" ? "accessoires" : kind === "contact" ? "contact" : "devis"} />
      {model ? <input type="hidden" name="model_id" value={model.id} /> : null}
      {categoryId ? <input type="hidden" name="category_id" value={categoryId} /> : null}
      {brand ? <input type="hidden" name="brand_id" value={brand.brand_id} /> : null}
      {accessory ? <input type="hidden" name="accessory_id" value={accessory.id} /> : null}
      {repairs.map((id) => (
        <input key={id} type="hidden" name="repair_type_ids" value={id} />
      ))}
      <div className="hidden" aria-hidden>
        <label>
          Site web <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {accessory ? (
        <Section title="Votre article">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-bg px-4 py-3">
            <p className="font-semibold">{accessory.name}</p>
            {accessory.price !== null ? <p className="font-display font-extrabold">{formatMoney(accessory.price, currency)}</p> : null}
          </div>
        </Section>
      ) : null}

      {kind === "devis" ? (
        <Section title="1. Votre appareil" error={errors.device}>
          {!editingDevice && model ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-bg px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Appareil choisi</p>
                <p className="font-display text-lg font-bold">
                  {brand?.name} {model.name}
                </p>
              </div>
              <Button variant="ghost" size="sm" icon={<PencilLine className="size-4" />} onClick={() => setEditingDevice(true)}>
                Changer
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <CategoryTabs
                categories={categories}
                value={categoryId}
                compact
                onChange={(id) => {
                  setCategoryId(id);
                  setBrand(null);
                  setModel(null);
                }}
              />
              {categoryId && !otherDevice ? (
                <BrandChooser
                  brands={brands.data}
                  loading={brands.loading}
                  value={brand?.brand_id ?? null}
                  onChange={(b) => {
                    setBrand(b);
                    setModel(null);
                  }}
                />
              ) : null}
              {brand && !otherDevice ? (
                <ModelSearch
                  models={models.data}
                  loading={models.loading}
                  value={model?.id ?? null}
                  brandName={brand.name}
                  onChange={(m) => {
                    setModel(m);
                    setEditingDevice(false);
                  }}
                />
              ) : null}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4.5 accent-brand-strong"
                  checked={otherDevice}
                  onChange={(e) => {
                    setOtherDevice(e.target.checked);
                    if (e.target.checked) {
                      setModel(null);
                      setBrand(null);
                    }
                  }}
                />
                Mon appareil n’est pas dans la liste
              </label>
            </div>
          )}
          {otherDevice || (!model && !editingDevice) ? (
            <Field label="Marque et modèle" htmlFor="device_other" className="mt-4" required>
              <Input id="device_other" name="device_other" placeholder="Ex. Lenovo IdeaPad 5, manette Xbox Elite…" maxLength={160} aria-invalid={Boolean(errors.device)} />
            </Field>
          ) : null}
        </Section>
      ) : null}

      {kind === "devis" ? (
        <Section title="2. La réparation" subtitle="Plusieurs choix possibles. Vous ne savez pas ? Choisissez « Diagnostic ».">
          <div className="grid gap-2 sm:grid-cols-2">
            {availableRepairs.map((type) => {
              const checked = repairs.includes(type.id);
              const price = priceFor(type.id);
              return (
                <label
                  key={type.id}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    checked ? "border-brand-strong bg-brand-soft/60" : "border-line-strong bg-surface hover:border-ink",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4.5 accent-brand-strong"
                    checked={checked}
                    onChange={() => setRepairs((current) => (checked ? current.filter((id) => id !== type.id) : [...current, type.id]))}
                  />
                  <RepairIcon icon={type.icon} className="size-5 text-brand-strong" />
                  <span className="flex-1 text-[15px] font-medium">{type.name}</span>
                  {price !== null ? <span className="text-sm font-bold">{formatMoney(price, currency)}</span> : null}
                </label>
              );
            })}
          </div>
          {estimate !== null ? (
            <p className="mt-4 rounded-xl bg-bg px-4 py-3 text-sm">
              Estimation selon nos tarifs : <strong className="font-display text-base">{formatMoney(estimate, currency)}</strong>
              <span className="text-muted"> — confirmée après diagnostic.</span>
            </p>
          ) : null}
          <Field label="Décrivez la panne" htmlFor="message" required className="mt-5" error={errors.message}>
            <Textarea
              id="message"
              name="message"
              rows={4}
              maxLength={3000}
              aria-invalid={Boolean(errors.message)}
              placeholder="Que s’est-il passé ? Depuis quand ? L’appareil s’allume-t-il encore ?"
            />
          </Field>
          <div className="mt-5">
            <p className="field-label">Photos (facultatif)</p>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, index) => (
                <div key={photo.url} className="relative size-24 overflow-hidden rounded-xl border border-line">
                  <img src={photo.url} alt={`Photo ${index + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-charcoal/80 text-white"
                    aria-label={`Retirer la photo ${index + 1}`}
                    onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 3 ? (
                <label className="grid size-24 cursor-pointer place-items-center rounded-xl border border-dashed border-line-strong bg-bg text-muted transition-colors hover:border-ink hover:text-ink">
                  <span className="flex flex-col items-center gap-1 text-xs font-medium">
                    <ImagePlus className="size-5" aria-hidden /> Ajouter
                  </span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
                </label>
              ) : null}
            </div>
            <p className="field-hint flex items-center gap-1.5">
              <Camera className="size-3.5" aria-hidden /> Jusqu’à 3 photos de l’écran ou des dégâts pour un devis plus précis.
            </p>
            {errors.photos ? <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.photos}</p> : null}
          </div>
        </Section>
      ) : null}

      {kind !== "devis" ? (
        <Section title={kind === "contact" ? "Votre message" : "Un détail à préciser ?"}>
          <Field label={kind === "contact" ? "Message" : "Message (facultatif)"} htmlFor="message" required={kind === "contact"} error={errors.message}>
            <Textarea id="message" name="message" rows={4} maxLength={3000} aria-invalid={Boolean(errors.message)} />
          </Field>
        </Section>
      ) : null}

      <Section title={kind === "devis" ? "3. Vos coordonnées" : "Vos coordonnées"}>
        <Field label="Votre nom" htmlFor="customer_name" required error={errors.customer_name}>
          <Input id="customer_name" name="customer_name" autoComplete="name" placeholder="Prénom et nom" maxLength={100} aria-invalid={Boolean(errors.customer_name)} />
        </Field>

        <fieldset className="mt-5">
          <legend className="field-label">
            Comment préférez-vous recevoir votre {kind === "devis" ? "devis" : "réponse"} ?<span className="text-brand-strong"> *</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {METHODS.map((m) => (
              <label
                key={m.value}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                  method === m.value ? "border-ink bg-ink text-on-fill" : "border-line-strong bg-surface hover:border-ink",
                )}
              >
                <input
                  type="radio"
                  name="preferred_contact"
                  value={m.value}
                  className="sr-only"
                  checked={method === m.value}
                  onChange={() => setMethod(m.value)}
                />
                <span className={clsx(method === m.value ? "text-brand" : m.value === "whatsapp" ? "text-whatsapp" : "text-ink")}>{m.icon}</span>
                <span>
                  <span className="block text-[15px] font-semibold">{m.label}</span>
                  <span className={clsx("block text-xs", method === m.value ? "text-on-fill/70" : "text-muted")}>{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.preferred_contact ? <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.preferred_contact}</p> : null}
        </fieldset>

        {method ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(["whatsapp", "telephone", "email"] satisfies ContactMethod[])
              .sort((a, b) => Number(b === method) - Number(a === method))
              .map((field) => {
                const required = field === method;
                const name = field === "telephone" ? "phone" : field;
                const label = field === "whatsapp" ? "Numéro WhatsApp" : field === "telephone" ? "Numéro de téléphone" : "Adresse e-mail";
                return (
                  <Field
                    key={field}
                    label={required ? label : `${label} (facultatif)`}
                    htmlFor={name}
                    required={required}
                    error={errors[name]}
                    className={required ? "sm:col-span-2" : undefined}
                  >
                    <Input
                      id={name}
                      name={name}
                      type={field === "email" ? "email" : "tel"}
                      inputMode={field === "email" ? "email" : "tel"}
                      autoComplete={field === "email" ? "email" : "tel"}
                      placeholder={field === "email" ? "vous@exemple.com" : "06 12 34 56 78"}
                      maxLength={field === "email" ? 160 : 40}
                      aria-invalid={Boolean(errors[name])}
                      required={required}
                    />
                  </Field>
                );
              })}
          </div>
        ) : null}

        <label className="mt-6 flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
          <input type="checkbox" name="consent" className="mt-0.5 size-4.5 shrink-0 accent-brand-strong" aria-invalid={Boolean(errors.consent)} />
          <span>
            J’accepte que mes coordonnées soient utilisées pour répondre à ma demande.{" "}
            <Link href="/confidentialite" className="underline underline-offset-2">En savoir plus</Link>
            <span className="text-brand-strong"> *</span>
          </span>
        </label>
      </Section>

      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        {state.status === "error" ? (
          <p className="text-sm font-medium text-danger" role="alert">
            {state.error}
          </p>
        ) : (
          <p className="text-xs text-muted">Sans engagement : vous validez le devis avant toute intervention.</p>
        )}
        <Button type="submit" size="lg" loading={pending} icon={pending ? undefined : <ArrowRight className="size-4" />}>
          {pending ? "Envoi en cours…" : kind === "devis" ? "Envoyer ma demande de devis" : "Envoyer"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, subtitle, error, children }: { title: string; subtitle?: string; error?: string; children: React.ReactNode }) {
  return (
    <section className="p-5 sm:p-8">
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      {error ? (
        <p className="mt-2 text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
