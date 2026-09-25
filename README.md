# Repareliya

Website and back-office for a phone, tablet, computer and console repair shop, built with **Next.js 16** and **Supabase** (database, authentication, storage and realtime).

## What it does

**Public site (French)**
- Home page: hero, device types, brands, a **price estimator** (device type → brand → model → prices per repair), featured prices, how-it-works, réalisations, accessoires, avis, contact with map.
- `/tarifs`, plus one SEO page per brand (`/reparation/apple`) and per model (`/reparation/apple/iphone-15-pro`).
- `/devis`: the **quote request form**. The customer picks the device and repairs, describes the problem, can attach 3 photos, gives their name, and chooses **how they want to be contacted: WhatsApp, phone or e-mail**. Only that field is required; the others are optional.
- `/accessoires` (reservable items), `/realisations` (before/after photos), `/avis` (reviews plus a form to leave one), `/contact`.
- `/d/<link>`: the customer's page for their devis or facture. They can view it, download the PDF and **accept or decline the devis online**.

**Dashboard (`/admin`)**
- **Boîte de réception**: every form submission arrives here in real time. Each request shows the preferred contact channel and one-click buttons (WhatsApp, call, SMS, e-mail), the photos, internal notes and a status.
- **Devis & factures**: create a devis from a request (customer, device and catalogue prices are pre-filled), then **send it through the customer's preferred channel**:
  - **WhatsApp** opens with the message and link ready.
  - **SMS** opens your SMS app.
  - **E-mail** is sent with the PDF attached (via Resend), or opens your mail app.
  - **Phone** means you call, then mark it as sent.

  Then convert the devis to a facture, validate it (sequential number, content locked), and mark it paid. The PDFs are generated on the server.
- **Appareils & tarifs**: models, brands, repair types and categories, plus a price grid per model (several qualities per repair, e.g. *Compatible / Original*, "à partir de", duration, featured on home).
- **Importer des appareils**: bring in **every device** from public, up-to-date sources:
  - **Apple**: [AppleDB](https://api.appledb.dev) (iPhone, iPad, Apple Watch, MacBook).
  - **Android**: [Google Play's official list of certified devices](https://storage.googleapis.com/play_public/supported_devices.csv) (Samsung, Xiaomi/Redmi/POCO, Google, Oppo, Honor, OnePlus, Motorola, Tecno, Infinix…). Names are cleaned up and de-duplicated, and you pick which models to import.
- **Accessoires**, **Réalisations**, **Avis** (moderation, replies, add reviews from Google/Facebook), **Réseaux sociaux**, **Paramètres** (shop info, hours, map, currency, phone country, VAT, legal IDs, bank details, devis/facture terms, password).

The starter catalogue has 429 models (recent Apple, Samsung, Xiaomi, Google, Huawei, Honor, Oppo, OnePlus… plus PlayStation, Switch, Xbox, Steam Deck), 17 repair types and 5 device categories. **No prices are invented.** Every price shows "Sur devis" until you enter it.

## Quick start (local)

Requirements: Node.js ≥ 20.9, Docker Desktop (for the local Supabase).

```bash
npm install
npx supabase start          # first run downloads the Docker images (a few GB)
cp .env.example .env.local  # then paste the URL + keys printed by the previous command
npm run create-admin -- you@example.com "A-strong-password"
npm run dev                 # http://localhost:3800  ·  dashboard: /admin
```

`npx supabase start` applies `supabase/migrations/*` and `supabase/seed.sql` automatically. Supabase Studio: http://127.0.0.1:54323.

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js (dev on port 3800) |
| `npm run typecheck` / `lint` | Checks |
| `npm run create-admin -- email "password"` | Create or promote a dashboard admin (also resets their password) |
| `npm run db:reset` | Rebuild the local database from migrations + seed (**erases local data**) |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` after a schema change |

## Going live

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Apply the schema and starter catalogue**:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --include-seed   # tables, security rules, storage buckets + starter catalogue
   ```
3. In Supabase → **Authentication → Sign In / Providers**, **turn off "Allow new users to sign up"**. Admins are only created with `npm run create-admin`.
4. **Deploy the Next.js app** (e.g. [Vercel](https://vercel.com): import the repo) with the variables from `.env.example`. Set `NEXT_PUBLIC_SITE_URL` to your real domain.
5. Run `npm run create-admin -- you@domain.com "password"` once, with the production keys in `.env.local`.
6. In the dashboard → **Paramètres**, fill in the shop name, phone/WhatsApp, address, hours, currency (MAD by default) and the invoice details (legal IDs, VAT, bank details). Then enter your prices in **Appareils & tarifs** and import more devices if needed.

### Optional integrations
- **E-mail (Resend)**: set `RESEND_API_KEY` and `EMAIL_FROM` (verified domain). Devis and factures are then sent by e-mail with the PDF attached, and you get an e-mail for every new request or online acceptance.
- **Google reviews**: set `GOOGLE_PLACES_API_KEY` (Places API "New") and your Place ID in Paramètres. The home and Avis pages then show your Google rating and latest Google reviews.
- **Anti-spam (Cloudflare Turnstile)**: create a widget in the Cloudflare dashboard → Turnstile (add your domain as a hostname), then set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. The devis, contact and accessoire forms and the review form then require the bot check, verified on the server. The site key is embedded at build time, so redeploy after changing it.
- **WhatsApp / SMS** need no API. The dashboard opens WhatsApp (`wa.me`) or the SMS app with the message ready, and you press Send. Fully automatic sending would require the paid WhatsApp Business Platform or an SMS provider (e.g. Twilio).

## CI/CD

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs on every pull request and every push to `main`:

- **Lint, typecheck & build**: `npm run lint`, `npm run typecheck`, `npm run build` (no Supabase keys needed).
- **Migrations & seed**: starts a throwaway local Supabase and checks that `supabase/migrations/*` and `seed.sql` apply cleanly.
- **Deploy** (on `main` only, after both checks pass): `supabase db push` to the production database, then a production deploy on Vercel.

The deploy is skipped, with a warning, until these **repository secrets** exist (GitHub → Settings → Secrets and variables → Actions):

| Secret | Where to find it |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | The database password chosen when creating the project |
| `SUPABASE_PROJECT_ID` | The project ref (`https://<project-ref>.supabase.co`) |
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Run `npx vercel link` once, then read `.vercel/project.json` |

Notes:
- The app's environment variables (`.env.example`) are set in the Vercel project, not in GitHub. The deploy pulls them from Vercel.
- The deploy never re-applies `seed.sql`. Load it once with `npx supabase db push --include-seed` when going live (step 2 above).
- `vercel.json` turns off Vercel's own Git deploys for `main`, so production is deployed only by the workflow, after the checks pass. Pull-request preview deployments still work if the repo is connected to Vercel.

## How it's built

- `src/app/(site)`: public pages (cached, and refreshed immediately when you edit something in the dashboard).
- `src/app/admin`: dashboard. Every page and server action re-checks admin rights, and Supabase row-level security enforces them in the database too.
- `src/app/d/[token]`: customer document page and PDF (unguessable link).
- `supabase/migrations`: schema, RLS policies, invoice numbering (`DEV-2026-0001`, `FAC-2026-0001`), total calculation, lock on validated invoices, storage buckets.
- `src/lib/catalog`: AppleDB / Google Play import and name normalisation.
- `src/lib/pdf`: devis/facture PDF template.

**Security notes**
- Visitors can only read the published catalogue and content. Form submissions go through server actions with validation, a honeypot, a minimum fill time and a per-connection rate limit. IPs are stored only as a salted hash.
- Customer photos are in a private bucket (signed links in the dashboard).
- A validated facture can't be edited or deleted, only cancelled.

## Notes
- The project lives in OneDrive, so Next.js warns about a slow file system. Moving the folder outside OneDrive makes `npm install` and dev builds faster.
- The previous HTML/SQLite prototype was moved to `../ancien-prototype/`. Its `data/` folder is still here because the old server (port 4173) was running and locking it. It's ignored by git and can be deleted once that server is stopped.
