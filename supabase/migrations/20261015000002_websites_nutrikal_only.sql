-- Footer shows only Nutrikal.com (still editable in Settings).
alter table public.settings alter column websites set default 'Nutrikal.com';

-- Replace the old default only where it was never changed.
update public.settings set websites = 'Nutrikal.com' where id = 1 and websites = 'Nutrikal.com, MadeByNatureLabs.com';
