import { Badge, type Tone } from "@/components/ui/badge";

export const REQUEST_STATUSES: { value: string; label: string; tone: Tone }[] = [
  { value: "nouveau", label: "Nouvelle", tone: "brand" },
  { value: "en_cours", label: "En cours", tone: "info" },
  { value: "devis_envoye", label: "Devis envoyé", tone: "warning" },
  { value: "accepte", label: "Acceptée", tone: "success" },
  { value: "termine", label: "Terminée", tone: "neutral" },
  { value: "archive", label: "Archivée", tone: "neutral" },
];

export function requestStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function RequestStatusBadge({ status }: { status: string }) {
  const s = REQUEST_STATUSES.find((x) => x.value === status);
  return <Badge tone={s?.tone ?? "neutral"}>{s?.label ?? status}</Badge>;
}

export const REQUEST_KINDS: Record<string, string> = { devis: "Devis", contact: "Message", accessoire: "Accessoire" };
