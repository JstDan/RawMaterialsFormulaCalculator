-- Sync now deactivates materials that were removed from the Google Sheet (and reactivates returning ones).
alter table public.sync_runs
  add column if not exists removed int not null default 0,
  add column if not exists restored int not null default 0;
