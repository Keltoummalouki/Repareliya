"use client";

import clsx from "clsx";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Share2,
  Smartphone,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard, exact: true },
  { href: "/admin/inbox", label: "Boîte de réception", icon: Inbox, badge: "requests" as const },
  { href: "/admin/documents", label: "Devis & factures", icon: FileText },
  { href: "/admin/appareils", label: "Appareils & tarifs", icon: Smartphone },
  { href: "/admin/accessoires", label: "Accessoires", icon: Package },
  { href: "/admin/realisations", label: "Réalisations", icon: ImageIcon },
  { href: "/admin/avis", label: "Avis", icon: Star, badge: "reviews" as const },
  { href: "/admin/reseaux", label: "Réseaux sociaux", icon: Share2 },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export function AdminSidebar({ email, counts }: { email: string; counts: { requests: number; reviews: number } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Tableau de bord" className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const count = item.badge ? counts[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
              active ? "bg-ink text-white" : "text-ink-soft hover:bg-black/[0.05] hover:text-ink",
            )}
          >
            <item.icon className={clsx("size-4.5 shrink-0", active ? "text-brand" : "text-muted")} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {count ? (
              <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-bold", active ? "bg-brand text-white" : "bg-brand-strong text-white")}>
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-black/[0.05]">
        <ExternalLink className="size-4 text-muted" aria-hidden /> Voir le site
      </Link>
      <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-black/[0.05]">
        <LogOut className="size-4 text-muted" aria-hidden /> Déconnexion
      </button>
      <p className="truncate px-3 pt-2 text-xs text-muted" title={email}>
        {email}
      </p>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Link href="/admin">
          <Logo className="text-[19px]" />
        </Link>
        <button type="button" className="grid size-10 place-items-center" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu className="size-5" />
          {counts.requests ? <span className="absolute right-3 top-3 size-2 rounded-full bg-brand-strong" /> : null}
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface pt-4">
            <div className="mb-4 flex items-center justify-between px-5">
              <Logo className="text-[19px]" />
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="grid size-9 place-items-center">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface pt-5 lg:flex">
        <Link href="/admin" className="mb-6 px-6">
          <Logo className="text-[20px]" />
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
