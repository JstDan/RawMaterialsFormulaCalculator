-- Raw materials are managed only in the Google Sheet. Names, prices and active status change only through
-- the sync-raw-materials Edge Function (service role, bypasses RLS and these grants). Staff users may read
-- the list and edit the regulatory note – nothing else.

drop policy if exists "raw_materials_insert" on public.raw_materials;

revoke insert, update, delete, truncate on public.raw_materials from anon, authenticated;
grant select on public.raw_materials to authenticated;
grant update (regulatory_note) on public.raw_materials to authenticated;
