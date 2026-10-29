-- SwagStack Studio schema
-- Run after the existing desk schema.sql in the Supabase SQL editor.
-- Requires Supabase Auth (auth.users). Do not weaken existing desk tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.ss_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'customer'
    check (role in ('customer', 'super_admin')),
  plan_id text not null default 'starter',
  status text not null default 'active'
    check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
create table if not exists public.ss_plans (
  id text primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'ZAR',
  billing_interval text not null default 'monthly'
    check (billing_interval in ('once', 'monthly', 'setup_monthly')),
  setup_fee_cents integer not null default 0 check (setup_fee_cents >= 0),
  max_websites integer not null default 1 check (max_websites >= 0),
  max_storage_mb integer not null default 100 check (max_storage_mb >= 0),
  custom_domain boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.ss_plans (id, name, description, price_cents, billing_interval, setup_fee_cents, max_websites, max_storage_mb, custom_domain, features, sort_order)
values
  (
    'starter',
    'Starter',
    'One published site on a SwagStack subdomain.',
    29900,
    'monthly',
    0,
    1,
    100,
    false,
    '["1 website","Subdomain publish","Live editor","Media uploads"]'::jsonb,
    1
  ),
  (
    'growth',
    'Growth',
    'Multiple sites plus custom domain support.',
    69900,
    'setup_monthly',
    150000,
    3,
    500,
    true,
    '["3 websites","Custom domain","Priority templates","500MB media"]'::jsonb,
    2
  ),
  (
    'agency',
    'Agency',
    'Higher limits for agencies managing client sites.',
    149900,
    'setup_monthly',
    350000,
    15,
    2048,
    true,
    '["15 websites","Custom domains","All templates","2GB media","Audit support"]'::jsonb,
    3
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Templates + versions
-- ---------------------------------------------------------------------------
create table if not exists public.ss_templates (
  id text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  preview_image text not null default '',
  min_plan_id text not null default 'starter' references public.ss_plans (id),
  status text not null default 'published'
    check (status in ('draft', 'published', 'retired')),
  supported_sections text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ss_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.ss_templates (id) on delete cascade,
  version integer not null,
  schema jsonb not null default '{}'::jsonb,
  default_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

-- ---------------------------------------------------------------------------
-- Websites + configuration
-- ---------------------------------------------------------------------------
create table if not exists public.ss_websites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ss_profiles (id) on delete cascade,
  template_id text not null references public.ss_templates (id),
  template_version integer not null default 1,
  name text not null,
  slug text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'unpublished', 'suspended')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug),
  unique (owner_id, name)
);

create table if not exists public.ss_website_configs (
  website_id uuid primary key references public.ss_websites (id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------
create table if not exists public.ss_media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ss_profiles (id) on delete cascade,
  website_id uuid references public.ss_websites (id) on delete set null,
  bucket_path text not null,
  public_url text not null default '',
  mime_type text not null,
  size_bytes integer not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Domains (architecture + workflow; DNS must be configured externally)
-- ---------------------------------------------------------------------------
create table if not exists public.ss_domains (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.ss_websites (id) on delete cascade,
  owner_id uuid not null references public.ss_profiles (id) on delete cascade,
  hostname text not null,
  kind text not null default 'subdomain'
    check (kind in ('subdomain', 'custom')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'error', 'removed')),
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  dns_instructions jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (hostname)
);

-- ---------------------------------------------------------------------------
-- Subscriptions, payments, usage, audit
-- ---------------------------------------------------------------------------
create table if not exists public.ss_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ss_profiles (id) on delete cascade,
  plan_id text not null references public.ss_plans (id),
  status text not null default 'incomplete'
    check (status in ('incomplete', 'active', 'past_due', 'canceled', 'expired')),
  provider text not null default 'none'
    check (provider in ('none', 'payfast', 'stripe')),
  provider_ref text not null default '',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ss_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ss_profiles (id) on delete cascade,
  subscription_id uuid references public.ss_subscriptions (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'ZAR',
  status text not null default 'requires_configuration'
    check (status in ('requires_configuration', 'pending', 'paid', 'failed', 'refunded')),
  provider text not null default 'none',
  provider_ref text not null default '',
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ss_usage_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ss_profiles (id) on delete cascade,
  metric text not null,
  quantity numeric not null default 0,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ss_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.ss_profiles (id) on delete set null,
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ss_support_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ss_profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.ss_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ss_profiles p
    where p.id = auth.uid() and p.role = 'super_admin' and p.status = 'active'
  );
$$;

create or replace function public.ss_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ss_profiles_updated on public.ss_profiles;
create trigger ss_profiles_updated
  before update on public.ss_profiles
  for each row execute function public.ss_touch_updated_at();

drop trigger if exists ss_websites_updated on public.ss_websites;
create trigger ss_websites_updated
  before update on public.ss_websites
  for each row execute function public.ss_touch_updated_at();

drop trigger if exists ss_templates_updated on public.ss_templates;
create trigger ss_templates_updated
  before update on public.ss_templates
  for each row execute function public.ss_touch_updated_at();

create or replace function public.ss_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ss_profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when lower(coalesce(new.email, '')) = lower(coalesce(current_setting('app.ss_bootstrap_admin_email', true), ''))
        then 'super_admin'
      else 'customer'
    end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists ss_on_auth_user_created on auth.users;
create trigger ss_on_auth_user_created
  after insert on auth.users
  for each row execute function public.ss_handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed templates (editable field schemas)
-- ---------------------------------------------------------------------------
insert into public.ss_templates (id, name, category, description, preview_image, min_plan_id, status, supported_sections)
values
  ('barber-noir', 'Barber Noir', 'Barber shops and salons', 'Dark cyber barbershop with services and booking CTA.', '/swagstack/previews/barber.svg', 'starter', 'published', array['hero','about','services','gallery','contact','seo']),
  ('bistro-pulse', 'Bistro Pulse', 'Restaurants and takeaways', 'Restaurant template with menu prices and WhatsApp order CTA.', '/swagstack/previews/bistro.svg', 'starter', 'published', array['hero','about','menu','gallery','contact','seo']),
  ('trade-edge', 'Trade Edge', 'Traders and trading education', 'Trading education landing with programs, prices, and mentor CTA.', '/swagstack/previews/trade.svg', 'starter', 'published', array['hero','about','programs','proof','contact','seo']),
  ('agency-signal', 'Agency Signal', 'Digital agencies and software', 'Agency site with services, case highlights, and contact.', '/swagstack/previews/agency.svg', 'growth', 'published', array['hero','about','services','work','contact','seo']),
  ('creator-folio', 'Creator Folio', 'Personal portfolios and creators', 'Portfolio for creators with projects and social links.', '/swagstack/previews/folio.svg', 'starter', 'published', array['hero','about','projects','contact','seo']),
  ('local-fix', 'Local Pro', 'Local service businesses', 'Local services template with offerings, pricing, and call CTA.', '/swagstack/previews/local.svg', 'starter', 'published', array['hero','about','services','contact','seo'])
on conflict (id) do nothing;

-- Default configs are applied from the application seed when versions are missing.
-- Version rows are inserted by the app bootstrap if empty; SQL seed for barber:

insert into public.ss_template_versions (template_id, version, schema, default_config)
select 'barber-noir', 1,
  '{"fields":[{"key":"businessName","label":"Business name","type":"text","section":"hero"},{"key":"headline","label":"Headline","type":"text","section":"hero"},{"key":"tagline","label":"Tagline","type":"textarea","section":"hero"},{"key":"heroImage","label":"Hero image","type":"image","section":"hero"},{"key":"logo","label":"Logo","type":"image","section":"hero"},{"key":"primaryColor","label":"Primary color","type":"color","section":"brand"},{"key":"accentColor","label":"Accent color","type":"color","section":"brand"},{"key":"about","label":"About","type":"textarea","section":"about"},{"key":"services","label":"Services","type":"services","section":"services"},{"key":"phone","label":"Phone","type":"text","section":"contact"},{"key":"email","label":"Email","type":"text","section":"contact"},{"key":"whatsapp","label":"WhatsApp link","type":"url","section":"contact"},{"key":"ctaText","label":"Button text","type":"text","section":"cta"},{"key":"ctaUrl","label":"Button URL","type":"url","section":"cta"},{"key":"seoTitle","label":"SEO title","type":"text","section":"seo"},{"key":"seoDescription","label":"SEO description","type":"textarea","section":"seo"}]}'::jsonb,
  '{"businessName":"Neon Fade Studio","headline":"Precision cuts. Cyber polish.","tagline":"Book your chair for fades, designs, and grooming that hit different.","heroImage":"","logo":"","primaryColor":"#071428","accentColor":"#22d3ee","about":"Barber Noir is built for modern barbershops that want a premium online presence without code.","services":[{"name":"Signature Fade","price":"180","description":"Clean taper with design-ready finish."},{"name":"Beard Sculpt","price":"120","description":"Line-up, oil, and shape."}],"phone":"+27 00 000 0000","email":"hello@example.com","whatsapp":"https://wa.me/27000000000","ctaText":"Book now","ctaUrl":"#contact","seoTitle":"Neon Fade Studio","seoDescription":"Premium barbershop site powered by SwagStack."}'::jsonb
where not exists (
  select 1 from public.ss_template_versions where template_id = 'barber-noir' and version = 1
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ss_profiles enable row level security;
alter table public.ss_plans enable row level security;
alter table public.ss_templates enable row level security;
alter table public.ss_template_versions enable row level security;
alter table public.ss_websites enable row level security;
alter table public.ss_website_configs enable row level security;
alter table public.ss_media_assets enable row level security;
alter table public.ss_domains enable row level security;
alter table public.ss_subscriptions enable row level security;
alter table public.ss_payments enable row level security;
alter table public.ss_usage_records enable row level security;
alter table public.ss_audit_logs enable row level security;
alter table public.ss_support_requests enable row level security;

-- Profiles
drop policy if exists ss_profiles_select on public.ss_profiles;
create policy ss_profiles_select on public.ss_profiles
  for select to authenticated
  using (id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_profiles_update_self on public.ss_profiles;
create policy ss_profiles_update_self on public.ss_profiles
  for update to authenticated
  using (id = auth.uid() or public.ss_is_super_admin())
  with check (
    (id = auth.uid() and role = (select role from public.ss_profiles where id = auth.uid()))
    or public.ss_is_super_admin()
  );

-- Plans (public read of active plans)
drop policy if exists ss_plans_read on public.ss_plans;
create policy ss_plans_read on public.ss_plans
  for select to anon, authenticated
  using (active = true or public.ss_is_super_admin());

drop policy if exists ss_plans_admin on public.ss_plans;
create policy ss_plans_admin on public.ss_plans
  for all to authenticated
  using (public.ss_is_super_admin())
  with check (public.ss_is_super_admin());

-- Templates
drop policy if exists ss_templates_read on public.ss_templates;
create policy ss_templates_read on public.ss_templates
  for select to anon, authenticated
  using (status = 'published' or public.ss_is_super_admin());

drop policy if exists ss_templates_admin on public.ss_templates;
create policy ss_templates_admin on public.ss_templates
  for all to authenticated
  using (public.ss_is_super_admin())
  with check (public.ss_is_super_admin());

drop policy if exists ss_template_versions_read on public.ss_template_versions;
create policy ss_template_versions_read on public.ss_template_versions
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.ss_templates t
      where t.id = template_id and (t.status = 'published' or public.ss_is_super_admin())
    )
  );

drop policy if exists ss_template_versions_admin on public.ss_template_versions;
create policy ss_template_versions_admin on public.ss_template_versions
  for all to authenticated
  using (public.ss_is_super_admin())
  with check (public.ss_is_super_admin());

-- Websites: owner or admin
drop policy if exists ss_websites_select on public.ss_websites;
create policy ss_websites_select on public.ss_websites
  for select to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_websites_insert on public.ss_websites;
create policy ss_websites_insert on public.ss_websites
  for insert to authenticated
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_websites_update on public.ss_websites;
create policy ss_websites_update on public.ss_websites
  for update to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin())
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_websites_delete on public.ss_websites;
create policy ss_websites_delete on public.ss_websites
  for delete to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin());

-- Public published site lookup (slug + published only) for anon render
drop policy if exists ss_websites_public_published on public.ss_websites;
create policy ss_websites_public_published on public.ss_websites
  for select to anon, authenticated
  using (status = 'published');

-- Configs
drop policy if exists ss_configs_owner on public.ss_website_configs;
create policy ss_configs_owner on public.ss_website_configs
  for all to authenticated
  using (
    exists (
      select 1 from public.ss_websites w
      where w.id = website_id and (w.owner_id = auth.uid() or public.ss_is_super_admin())
    )
  )
  with check (
    exists (
      select 1 from public.ss_websites w
      where w.id = website_id and (w.owner_id = auth.uid() or public.ss_is_super_admin())
    )
  );

drop policy if exists ss_configs_public_published on public.ss_website_configs;
create policy ss_configs_public_published on public.ss_website_configs
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.ss_websites w
      where w.id = website_id and w.status = 'published'
    )
  );

-- Media
drop policy if exists ss_media_owner on public.ss_media_assets;
create policy ss_media_owner on public.ss_media_assets
  for all to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin())
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

-- Domains
drop policy if exists ss_domains_owner on public.ss_domains;
create policy ss_domains_owner on public.ss_domains
  for all to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin())
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_domains_public_active on public.ss_domains;
create policy ss_domains_public_active on public.ss_domains
  for select to anon, authenticated
  using (status = 'active');

-- Billing tables
drop policy if exists ss_subs_owner on public.ss_subscriptions;
create policy ss_subs_owner on public.ss_subscriptions
  for all to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin())
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_payments_owner on public.ss_payments;
create policy ss_payments_owner on public.ss_payments
  for all to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin())
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_usage_owner on public.ss_usage_records;
create policy ss_usage_owner on public.ss_usage_records
  for all to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin())
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_audit_admin on public.ss_audit_logs;
create policy ss_audit_admin on public.ss_audit_logs
  for select to authenticated
  using (public.ss_is_super_admin() or actor_id = auth.uid());

drop policy if exists ss_audit_insert on public.ss_audit_logs;
create policy ss_audit_insert on public.ss_audit_logs
  for insert to authenticated
  with check (actor_id = auth.uid() or public.ss_is_super_admin());

drop policy if exists ss_support_owner on public.ss_support_requests;
create policy ss_support_owner on public.ss_support_requests
  for all to authenticated
  using (owner_id = auth.uid() or public.ss_is_super_admin())
  with check (owner_id = auth.uid() or public.ss_is_super_admin());

-- Storage bucket for SwagStack media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'swagstack-media',
  'swagstack-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ss_media_storage_read on storage.objects;
create policy ss_media_storage_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'swagstack-media');

drop policy if exists ss_media_storage_insert on storage.objects;
create policy ss_media_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'swagstack-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists ss_media_storage_update on storage.objects;
create policy ss_media_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'swagstack-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'swagstack-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists ss_media_storage_delete on storage.objects;
create policy ss_media_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'swagstack-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
