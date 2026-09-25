import { Logo } from "@/components/icons";

export function SetupNotice() {
  return (
    <main className="container-page grid min-h-screen place-items-center py-16">
      <div className="card max-w-xl p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Configuration requise</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Le site n’est pas encore relié à Supabase. Copiez <code className="rounded bg-ink/5 px-1.5">.env.example</code> vers{" "}
          <code className="rounded bg-ink/5 px-1.5">.env.local</code>, renseignez l’URL et les clés de votre projet
          Supabase, puis redémarrez le serveur. Toutes les étapes sont décrites dans le README.
        </p>
      </div>
    </main>
  );
}
