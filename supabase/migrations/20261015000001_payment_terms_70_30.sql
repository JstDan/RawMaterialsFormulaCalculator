-- Default payment terms 70/30 (still editable in Settings and per offer).
alter table public.settings
  alter column default_payment_terms set default '70% Down Payment and 30% Balance Payment when goods are ready to be shipped';

-- Replace the previous default only where it was never changed.
update public.settings
set default_payment_terms = '70% Down Payment and 30% Balance Payment when goods are ready to be shipped'
where id = 1 and default_payment_terms = '50% Down Payment and 50% Balance Payment when goods are ready to be shipped';
