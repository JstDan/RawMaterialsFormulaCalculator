-- Google Sheet price-list sync: source URL in settings, a log of sync runs, and a daily schedule.

alter table public.settings
  add column if not exists google_sheet_url text not null
  default 'https://docs.google.com/spreadsheets/d/1dfylFe0D-xWlQ1PXcVUAGtNrPNS4bGJK/edit?usp=sharing';

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('manual', 'scheduled', 'auto')),
  status text not null check (status in ('success', 'error')),
  added int not null default 0,
  changed int not null default 0,
  unchanged int not null default 0,
  invalid int not null default 0,
  missing int not null default 0,
  details jsonb,
  error text,
  triggered_by uuid references auth.users (id) on delete set null
);

create index if not exists sync_runs_created_at_idx on public.sync_runs (created_at desc);

-- Staff can read the log; only the Edge Function (service role) writes it.
alter table public.sync_runs enable row level security;
create policy "sync_runs_select" on public.sync_runs for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Daily sync at 03:00 UTC via pg_cron + pg_net, calling the sync-raw-materials Edge Function.
-- Requires two Vault secrets (see README):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random string>', 'sync_cron_secret');
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-raw-materials-daily',
  '0 3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sync-raw-materials',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_cron_secret')
    ),
    body := '{"source":"scheduled"}'::jsonb
  );
  $$
);
