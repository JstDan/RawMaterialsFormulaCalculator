-- New default payment terms (still editable in Settings and per offer).
alter table public.settings
  alter column default_payment_terms set default '50% Down Payment and 50% Balance Payment when goods are ready to be shipped';

-- Replace the old default only where it was never changed.
update public.settings
set default_payment_terms = '50% Down Payment and 50% Balance Payment when goods are ready to be shipped'
where id = 1 and default_payment_terms = '100% advance payment';
