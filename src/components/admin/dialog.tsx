"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-scrim sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-(--shadow-float) sm:rounded-2xl sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-9 place-items-center rounded-lg hover:bg-ink/5">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
