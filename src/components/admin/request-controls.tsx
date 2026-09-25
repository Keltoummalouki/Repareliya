"use client";

import { Archive, MailOpen, Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteRequest, updateRequest } from "@/app/admin/(dashboard)/inbox/actions";
import { REQUEST_STATUSES } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";

type Status = "nouveau" | "en_cours" | "devis_envoye" | "accepte" | "termine" | "archive";

export function RequestStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label="Statut de la demande"
      value={status}
      disabled={pending}
      className="h-10 min-h-0 w-auto py-1.5 text-sm font-semibold"
      onChange={(e) =>
        start(async () => {
          const result = await updateRequest(id, { status: e.target.value as Status });
          if (!result.ok) toast.error(result.error);
          else toast.success("Statut mis à jour");
          router.refresh();
        })
      }
    >
      {REQUEST_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}

export function RequestNotes({ id, notes }: { id: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [pending, start] = useTransition();
  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Notes internes : diagnostic, pièce à commander, rappel prévu…"
        aria-label="Notes internes"
      />
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          loading={pending}
          disabled={value === notes}
          icon={<Save className="size-4" />}
          onClick={() =>
            start(async () => {
              const result = await updateRequest(id, { admin_notes: value });
              if (result.ok) toast.success("Notes enregistrées");
              else toast.error(result.error);
            })
          }
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

export function RequestActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        icon={<MailOpen className="size-4" />}
        onClick={() =>
          start(async () => {
            await updateRequest(id, { is_read: false });
            router.push("/admin/inbox");
          })
        }
      >
        Marquer non lue
      </Button>
      {status !== "archive" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          icon={<Archive className="size-4" />}
          onClick={() =>
            start(async () => {
              const result = await updateRequest(id, { status: "archive" });
              if (result.ok) {
                toast.success("Demande archivée");
                router.push("/admin/inbox");
              } else toast.error(result.error);
            })
          }
        >
          Archiver
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        className="text-danger"
        disabled={pending}
        icon={<Trash className="size-4" />}
        onClick={() => {
          if (!confirm("Supprimer définitivement cette demande et ses photos ?")) return;
          start(async () => {
            const result = await deleteRequest(id);
            if (result.ok) {
              toast.success("Demande supprimée");
              router.push("/admin/inbox");
            } else toast.error(result.error);
          });
        }}
      >
        Supprimer
      </Button>
    </div>
  );
}
