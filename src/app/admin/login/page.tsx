import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/icons";
import { LoginForm } from "@/components/admin/login-form";
import { getAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  if (isSupabaseConfigured() && (await getAdmin())) redirect(target);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-3 text-sm text-muted">Tableau de bord de l’atelier</p>
        </div>
        <LoginForm next={target} />
      </div>
    </main>
  );
}
