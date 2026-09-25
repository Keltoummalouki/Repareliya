import { z } from "zod";

export type DocumentType = "devis" | "facture";
export type DocumentStatus = "brouillon" | "envoye" | "accepte" | "refuse" | "paye" | "annule";

export const documentItemSchema = z.object({
  description: z.string().trim().min(1, "Description requise").max(300),
  quantity: z.coerce.number().min(0.01).max(9999),
  unit_price: z.coerce.number().min(-1_000_000).max(1_000_000),
});

export type DocumentItem = z.infer<typeof documentItemSchema>;

export function parseItems(value: unknown): DocumentItem[] {
  const parsed = z.array(documentItemSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Même calcul que le déclencheur SQL documents_before_write. */
export function computeTotals(items: DocumentItem[], taxRate: number, pricesIncludeTax: boolean) {
  const lines = round2(items.reduce((sum, item) => sum + round2(item.quantity * item.unit_price), 0));
  const rate = taxRate || 0;
  if (pricesIncludeTax) {
    const subtotal = round2(lines / (1 + rate / 100));
    return { subtotal, tax: round2(lines - subtotal), total: lines };
  }
  const tax = round2((lines * rate) / 100);
  return { subtotal: lines, tax, total: round2(lines + tax) };
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = { devis: "Devis", facture: "Facture" };

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = {
  brouillon: { label: "Brouillon", tone: "neutral" },
  envoye: { label: "Envoyé", tone: "info" },
  accepte: { label: "Accepté", tone: "success" },
  refuse: { label: "Refusé", tone: "danger" },
  paye: { label: "Payée", tone: "success" },
  annule: { label: "Annulé", tone: "danger" },
};

export function documentStatusLabel(type: DocumentType, status: DocumentStatus) {
  if (type === "facture" && status === "envoye") return "Émise";
  if (type === "facture" && status === "annule") return "Annulée";
  return DOCUMENT_STATUS[status]?.label ?? status;
}

export const PAYMENT_METHODS = ["Espèces", "Carte bancaire", "Virement", "Chèque", "Paiement mobile", "Autre"];

export function documentTitle(type: DocumentType, number: string | null) {
  return `${DOCUMENT_TYPE_LABEL[type]} ${number ?? "(brouillon)"}`;
}
