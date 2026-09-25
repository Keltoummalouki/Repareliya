import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Tableau de bord", template: "%s · Tableau de bord" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const { supabase, email } = await requireAdmin();
  const [{ count: requests }, { count: reviews }] = await Promise.all([
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
  ]);

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-bg lg:flex">
      <AdminSidebar email={email} counts={{ requests: requests ?? 0, reviews: reviews ?? 0 }} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
