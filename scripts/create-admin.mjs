// Crée (ou promeut) un compte administrateur du tableau de bord.
// Usage : npm run create-admin -- email@exemple.com "MotDePasseSolide"
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage : npm run create-admin -- email@exemple.com "MotDePasse"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définis (.env.local).");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

let userId;
const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  if (!/already|registered|exists/i.test(error.message)) {
    console.error("Erreur :", error.message);
    process.exit(1);
  }
  // Le compte existe : on le retrouve et on met à jour son mot de passe
  let page = 1;
  while (!userId) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw listError;
    userId = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  if (!userId) {
    console.error("Compte introuvable.");
    process.exit(1);
  }
  await supabase.auth.admin.updateUserById(userId, { password });
  console.log("Compte existant : mot de passe mis à jour.");
} else {
  userId = created.user.id;
}

const { error: adminError } = await supabase.from("admins").upsert({ user_id: userId, email });
if (adminError) {
  console.error("Erreur :", adminError.message);
  process.exit(1);
}
console.log(`✓ ${email} est administrateur. Connexion : /admin/login`);
