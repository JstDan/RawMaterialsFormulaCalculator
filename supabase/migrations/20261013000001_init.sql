-- Nutrikal Formula Calculator – schema, offer numbering and row level security.

create extension if not exists pgcrypto;

-- Shared trigger to keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Raw materials (prices are DDP, EUR per kg, excl. VAT)
-- ---------------------------------------------------------------------------
create table if not exists public.raw_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_eur_per_kg numeric(12, 4) not null check (price_eur_per_kg >= 0),
  regulatory_note text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger raw_materials_updated_at
  before update on public.raw_materials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Settings (single row, id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  fixed_cost_capsules_glass numeric(10, 2) not null default 2.50,
  fixed_cost_capsules_plastic numeric(10, 2) not null default 2.20,
  fixed_cost_powder numeric(10, 2) not null default 2.70,
  default_markup numeric(6, 2) not null default 30,
  default_vat_rate numeric(5, 2) not null default 20,
  company_name text not null default 'Nutrikal',
  company_address text not null default 'Bulgaria',
  company_vat text not null default '',
  company_email text not null default 'sales@nutrikal.com',
  company_phone text not null default '',
  logo_data_url text,
  terms_text text not null default 'Prices are in EUR excl. VAT. Lead time and MOQ to be confirmed upon order. Final label text subject to EU regulatory review.',
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Offers. `data` holds every form input incl. a snapshot of the raw material
-- prices and fixed costs used, so later price changes never alter old offers.
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  offer_no text not null unique,
  receiver_name text not null,
  receiver_email text not null,
  company_name text,
  product_name text,
  product_type text check (product_type in ('capsules_glass', 'capsules_plastic', 'powder')),
  total_excl_vat numeric(14, 2) not null default 0,
  total_incl_vat numeric(14, 2) not null default 0,
  data jsonb not null,
  results jsonb not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_created_at_idx on public.offers (created_at desc);

create trigger offers_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sequential offer numbers per year: NK-YYYY-0001
-- ---------------------------------------------------------------------------
create table if not exists public.offer_counters (
  year int primary key,
  last_no int not null default 0
);

create or replace function public.next_offer_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.offer_counters (year, last_no)
  values (y, 1)
  on conflict (year) do update set last_no = public.offer_counters.last_no + 1
  returning last_no into n;

  return 'NK-' || y || '-' || lpad(n::text, 4, '0');
end;
$$;

revoke all on function public.next_offer_no() from public, anon;
grant execute on function public.next_offer_no() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security: only authenticated (internal staff) users.
-- ---------------------------------------------------------------------------
alter table public.raw_materials enable row level security;
alter table public.settings enable row level security;
alter table public.offers enable row level security;
alter table public.offer_counters enable row level security; -- no policies: only via next_offer_no()

create policy "raw_materials_select" on public.raw_materials for select to authenticated using (true);
create policy "raw_materials_insert" on public.raw_materials for insert to authenticated with check (true);
create policy "raw_materials_update" on public.raw_materials for update to authenticated using (true) with check (true);

create policy "settings_select" on public.settings for select to authenticated using (true);
create policy "settings_update" on public.settings for update to authenticated using (true) with check (true);

create policy "offers_select" on public.offers for select to authenticated using (true);
create policy "offers_insert" on public.offers for insert to authenticated with check (true);
create policy "offers_update" on public.offers for update to authenticated using (true) with check (true);
create policy "offers_delete" on public.offers for delete to authenticated using (true);
