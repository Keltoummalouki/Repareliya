"use client";

import clsx from "clsx";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";

async function uploadToMedia(file: File, folder: string) {
  const compressed = file.type === "image/svg+xml" ? file : await compressImage(file, 1800, 0.85);
  const ext = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from("media").upload(path, compressed, { contentType: compressed.type, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Image",
  aspect = "aspect-[4/3]",
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  label?: string;
  aspect?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choisissez une image.");
    setLoading(true);
    try {
      onChange(await uploadToMedia(file, folder));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l’envoi de l’image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <p className="field-label">{label}</p>
      <div className={clsx("relative overflow-hidden rounded-xl border border-dashed border-line-strong bg-bg", aspect)}>
        {value ? (
          <>
            <img src={value} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-ink/80 text-white"
              aria-label={`Retirer : ${label}`}
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <label className="flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 text-sm text-muted hover:text-ink">
            {loading ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            {loading ? "Envoi…" : "Choisir une image"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} disabled={loading} />
          </label>
        )}
      </div>
    </div>
  );
}

export function MultiImageUpload({ value, onChange, folder, label = "Galerie" }: { value: string[]; onChange: (urls: string[]) => void; folder: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 8)) if (file.type.startsWith("image/")) urls.push(await uploadToMedia(file, folder));
      onChange([...value, ...urls].slice(0, 12));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l’envoi.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative size-24 overflow-hidden rounded-xl border border-line">
            <img src={url} alt={`Image ${i + 1}`} className="size-full object-cover" />
            <button type="button" className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/80 text-white" aria-label={`Retirer l’image ${i + 1}`} onClick={() => onChange(value.filter((u) => u !== url))}>
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <label className="grid size-24 cursor-pointer place-items-center rounded-xl border border-dashed border-line-strong bg-bg text-muted hover:text-ink">
          {loading ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={loading} />
        </label>
      </div>
    </div>
  );
}
