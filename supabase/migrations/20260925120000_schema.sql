-- =====================================================================
-- Repareliya — schéma principal
-- Catalogue (catégories, marques, modèles, réparations, tarifs),
-- boîte de réception (demandes), devis/factures, accessoires,
-- réalisations, avis, réseaux sociaux et paramètres.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Administrateurs
-- ---------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins: lecture de soi ou admin"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- Paramètres
-- ---------------------------------------------------------------------
-- Paramètres publics (affichés sur le site)
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Paramètres privés (facturation, coordonnées bancaires…)
create table public.invoice_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger invoice_settings_updated before update on public.invoice_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;
alter table public.invoice_settings enable row level security;

create policy "site_settings: lecture publique" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: écriture admin" on public.site_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "invoice_settings: admin" on public.invoice_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.site_settings (id, data) values (1, '{}'::jsonb) on conflict do nothing;
insert into public.invoice_settings (id, data) values (1, '{}'::jsonb) on conflict do nothing;

-- ---------------------------------------------------------------------
-- Catalogue des appareils
-- ---------------------------------------------------------------------
create table public.device_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text not null default 'smartphone',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  sort_order int not null default 100,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.device_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  category_id uuid not null references public.device_categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null,
  image_url text,
  release_year int check (release_year between 1990 and 2100),
  sort_order int not null default 0,
  is_popular boolean not null default false,
  is_active boolean not null default true,
  source text not null default 'manuel' check (source in ('manuel', 'catalogue', 'appledb', 'google_play')),
  created_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create index device_models_brand_category_idx on public.device_models (brand_id, category_id);
create index device_models_category_idx on public.device_models (category_id);

create table public.repair_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text not null default 'wrench',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catégories concernées par un type de réparation (aucune ligne = toutes)
create table public.repair_type_categories (
  repair_type_id uuid not null references public.repair_types (id) on delete cascade,
  category_id uuid not null references public.device_categories (id) on delete cascade,
  primary key (repair_type_id, category_id)
);

create table public.repair_prices (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.device_models (id) on delete cascade,
  repair_type_id uuid not null references public.repair_types (id) on delete cascade,
  quality text not null default '',
  price numeric(10, 2) check (price is null or price >= 0),
  price_is_from boolean not null default false,
  duration text,
  note text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  unique (model_id, repair_type_id, quality)
);

create index repair_prices_model_idx on public.repair_prices (model_id);
create index repair_prices_featured_idx on public.repair_prices (is_featured) where is_featured;

create trigger repair_prices_updated before update on public.repair_prices
  for each row execute function public.set_updated_at();

-- Marques présentes par catégorie (pour les sélecteurs du site)
create view public.category_brands
with (security_invoker = true)
as
select
  m.category_id,
  b.id as brand_id,
  b.slug,
  b.name,
  b.logo_url,
  b.sort_order,
  b.is_featured,
  count(m.id)::int as model_count
from public.brands b
join public.device_models m on m.brand_id = b.id and m.is_active
where b.is_active
group by m.category_id, b.id;

alter table public.device_categories enable row level security;
alter table public.brands enable row level security;
alter table public.device_models enable row level security;
alter table public.repair_types enable row level security;
alter table public.repair_type_categories enable row level security;
alter table public.repair_prices enable row level security;

create policy "categories: lecture publique" on public.device_categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "categories: admin" on public.device_categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "brands: lecture publique" on public.brands
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "brands: admin" on public.brands
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "models: lecture publique" on public.device_models
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "models: admin" on public.device_models
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "repair_types: lecture publique" on public.repair_types
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "repair_types: admin" on public.repair_types
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "repair_type_categories: lecture publique" on public.repair_type_categories
  for select to anon, authenticated using (true);
create policy "repair_type_categories: admin" on public.repair_type_categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "repair_prices: lecture publique" on public.repair_prices
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "repair_prices: admin" on public.repair_prices
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Accessoires
-- ---------------------------------------------------------------------
create table public.accessories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique,
  category text not null default 'Autre',
  description text,
  price numeric(10, 2) check (price is null or price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  image_url text,
  compatible_with text,
  stock_status text not null default 'en_stock' check (stock_status in ('en_stock', 'sur_commande', 'rupture')),
  is_published boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accessories_updated before update on public.accessories
  for each row execute function public.set_updated_at();

alter table public.accessories enable row level security;
create policy "accessories: lecture publique" on public.accessories
  for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy "accessories: admin" on public.accessories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Réalisations
-- ---------------------------------------------------------------------
create table public.realisations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  slug text not null unique,
  description text,
  device_label text,
  repair_label text,
  category_id uuid references public.device_categories (id) on delete set null,
  before_image_url text,
  after_image_url text,
  images text[] not null default '{}',
  performed_on date,
  is_published boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger realisations_updated before update on public.realisations
  for each row execute function public.set_updated_at();

alter table public.realisations enable row level security;
create policy "realisations: lecture publique" on public.realisations
  for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy "realisations: admin" on public.realisations
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Réseaux sociaux
-- ---------------------------------------------------------------------
create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in (
    'facebook', 'instagram', 'tiktok', 'whatsapp', 'snapchat', 'youtube',
    'x', 'linkedin', 'google', 'threads', 'telegram', 'autre'
  )),
  label text,
  url text not null check (url ~* '^(https?://|mailto:|tel:)'),
  handle text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.social_links enable row level security;
create policy "social_links: lecture publique" on public.social_links
  for select to anon, authenticated using (is_visible or (select public.is_admin()));
create policy "social_links: admin" on public.social_links
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Avis clients
-- ---------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(author_name) between 2 and 80),
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 5 and 2000),
  device_label text,
  source text not null default 'site' check (source in ('site', 'google', 'facebook', 'manuel')),
  status text not null default 'en_attente' check (status in ('en_attente', 'publie', 'refuse')),
  is_featured boolean not null default false,
  reply text,
  ip_hash text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index reviews_status_idx on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;
create policy "reviews: lecture des avis publiés" on public.reviews
  for select to anon, authenticated using (status = 'publie' or (select public.is_admin()));
create policy "reviews: admin" on public.reviews
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ip_hash ne doit pas être lisible publiquement
revoke select on public.reviews from anon;
grant select (id, author_name, rating, comment, device_label, source, status, is_featured, reply, created_at, published_at)
  on public.reviews to anon;

-- ---------------------------------------------------------------------
-- Demandes (boîte de réception)
-- ---------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  kind text not null default 'devis' check (kind in ('devis', 'contact', 'accessoire')),
  status text not null default 'nouveau' check (status in ('nouveau', 'en_cours', 'devis_envoye', 'accepte', 'termine', 'archive')),
  is_read boolean not null default false,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  preferred_contact text not null check (preferred_contact in ('telephone', 'whatsapp', 'email')),
  phone text,
  whatsapp text,
  email text,
  category_id uuid references public.device_categories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  model_id uuid references public.device_models (id) on delete set null,
  device_label text,
  repair_type_ids uuid[] not null default '{}',
  repair_labels text[] not null default '{}',
  accessory_id uuid references public.accessories (id) on delete set null,
  message text,
  photos text[] not null default '{}',
  estimated_price numeric(10, 2),
  admin_notes text,
  source_page text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_contact_present check (
    (preferred_contact = 'telephone' and coalesce(btrim(phone), '') <> '')
    or (preferred_contact = 'whatsapp' and coalesce(btrim(whatsapp), '') <> '')
    or (preferred_contact = 'email' and coalesce(btrim(email), '') <> '')
  )
);

create index requests_status_idx on public.requests (status, created_at desc);
create index requests_created_idx on public.requests (created_at desc);
create index requests_ip_idx on public.requests (ip_hash, created_at desc);

create trigger requests_updated before update on public.requests
  for each row execute function public.set_updated_at();

alter table public.requests enable row level security;
create policy "requests: admin" on public.requests
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Devis & factures
-- ---------------------------------------------------------------------
create table public.document_counters (
  doc_type text not null,
  year int not null,
  last_value int not null default 0,
  primary key (doc_type, year)
);

alter table public.document_counters enable row level security;
create policy "document_counters: admin lecture" on public.document_counters
  for select to authenticated using ((select public.is_admin()));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('devis', 'facture')),
  number text unique,
  status text not null default 'brouillon' check (status in ('brouillon', 'envoye', 'accepte', 'refuse', 'paye', 'annule')),
  request_id uuid references public.requests (id) on delete set null,
  source_document_id uuid references public.documents (id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 160),
  customer_phone text,
  customer_whatsapp text,
  customer_email text,
  customer_address text,
  preferred_contact text check (preferred_contact in ('telephone', 'whatsapp', 'email')),
  device_label text,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  prices_include_tax boolean not null default true,
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency text not null default 'MAD',
  notes text,
  terms text,
  issue_date date not null default current_date,
  valid_until date,
  due_date date,
  public_token uuid not null default gen_random_uuid() unique,
  sent_at timestamptz,
  sent_via text check (sent_via in ('email', 'whatsapp', 'sms', 'telephone', 'autre')),
  accepted_at timestamptz,
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_status_by_type check (
    (type = 'devis' and status in ('brouillon', 'envoye', 'accepte', 'refuse', 'annule'))
    or (type = 'facture' and status in ('brouillon', 'envoye', 'paye', 'annule'))
  )
);

create index documents_type_status_idx on public.documents (type, status, created_at desc);
create index documents_request_idx on public.documents (request_id);

-- Numéro séquentiel par type et par année : DEV-2026-0001 / FAC-2026-0001
create or replace function public.next_document_number(p_type text, p_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from coalesce(p_date, current_date))::int;
  v_value int;
begin
  insert into public.document_counters as c (doc_type, year, last_value)
  values (p_type, v_year, 1)
  on conflict (doc_type, year) do update set last_value = c.last_value + 1
  returning last_value into v_value;

  return case p_type when 'facture' then 'FAC' else 'DEV' end
    || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end;
$$;

revoke all on function public.next_document_number(text, date) from public, anon, authenticated;

-- Calcul des totaux (lignes : quantity × unit_price, remises en négatif)
create or replace function public.documents_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lines numeric := 0;
  v_rate numeric := coalesce(new.tax_rate, 0);
begin
  select coalesce(sum(
    round(coalesce((item ->> 'quantity')::numeric, 0) * coalesce((item ->> 'unit_price')::numeric, 0), 2)
  ), 0)
  into v_lines
  from jsonb_array_elements(new.items) as item;

  if new.prices_include_tax then
    new.total := round(v_lines, 2);
    new.subtotal := round(v_lines / (1 + v_rate / 100), 2);
    new.tax_amount := new.total - new.subtotal;
  else
    new.subtotal := round(v_lines, 2);
    new.tax_amount := round(v_lines * v_rate / 100, 2);
    new.total := new.subtotal + new.tax_amount;
  end if;

  -- Une facture validée ne peut plus être modifiée sur le fond
  if tg_op = 'UPDATE' and old.type = 'facture' and old.status <> 'brouillon' then
    if new.items is distinct from old.items
      or new.tax_rate is distinct from old.tax_rate
      or new.prices_include_tax is distinct from old.prices_include_tax
      or new.customer_name is distinct from old.customer_name
      or new.customer_address is distinct from old.customer_address
      or new.issue_date is distinct from old.issue_date
      or new.number is distinct from old.number
      or new.type is distinct from old.type
      or new.currency is distinct from old.currency then
      raise exception 'Cette facture est validée : son contenu ne peut plus être modifié. Annulez-la et créez-en une nouvelle.'
        using errcode = 'P0001';
    end if;
    if new.status = 'brouillon' then
      raise exception 'Une facture validée ne peut pas repasser en brouillon.' using errcode = 'P0001';
    end if;
  end if;

  -- Numérotation : dès la création pour un devis ; à la validation
  -- (sortie du brouillon) pour une facture, afin de garder une suite sans trou.
  if new.number is null and (new.type = 'devis' or new.status <> 'brouillon') then
    new.number := public.next_document_number(new.type, new.issue_date);
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_before_write
  before insert or update on public.documents
  for each row execute function public.documents_before_write();

create or replace function public.documents_before_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.type = 'facture' and old.number is not null then
    raise exception 'Une facture numérotée ne peut pas être supprimée. Annulez-la plutôt.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger documents_before_delete
  before delete on public.documents
  for each row execute function public.documents_before_delete();

alter table public.documents enable row level security;
create policy "documents: admin" on public.documents
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Temps réel : la boîte de réception se met à jour en direct
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.requests;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Stockage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']),
  ('request-photos', 'request-photos', false, 8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "media: écriture admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media: modification admin" on storage.objects
  for update to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "media: suppression admin" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "request-photos: lecture admin" on storage.objects
  for select to authenticated using (bucket_id = 'request-photos' and (select public.is_admin()));
create policy "request-photos: suppression admin" on storage.objects
  for delete to authenticated using (bucket_id = 'request-photos' and (select public.is_admin()));
