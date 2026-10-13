-- New PDF offer template (based on Nutrikal's offer layout): supplier identification, bank details,
-- payment terms, VAT exemption text, footer and service presets for extra offer lines.

alter table public.settings
  add column if not exists company_id text not null default 'BG202245000',
  add column if not exists bank_iban text not null default 'BG04FINV91501017654214 (EUR)',
  add column if not exists bank_name text not null default 'First Investment Bank AD',
  add column if not exists bank_bic text not null default 'FINVBGSF',
  add column if not exists bank_address text not null default '37 Dragan Tsankov Blvd, 1797 Sofia, Bulgaria',
  add column if not exists default_payment_terms text not null default '100% advance payment',
  add column if not exists vat_exemption_text text not null default 'VAT Exemption',
  add column if not exists footer_text text not null default 'Thank you for your business!',
  add column if not exists websites text not null default 'Nutrikal.com, MadeByNatureLabs.com',
  add column if not exists service_presets jsonb not null default '[
    {"description": "Free Sale Certificate", "unit": "pcs.", "price": 300},
    {"description": "Certificate of analysis", "unit": "pcs.", "price": 220},
    {"description": "Label design service", "unit": "pcs.", "price": 200}
  ]'::jsonb;

-- Replace the original placeholder supplier details with the ones from the offer template
-- (only where they were never changed).
update public.settings set company_name = 'Nutrikal Ltd' where id = 1 and company_name = 'Nutrikal';
update public.settings set company_address = '133 Knyaz Boriz 1 Blvd., 9000 Varna, Bulgaria'
  where id = 1 and company_address = 'Bulgaria';
update public.settings set company_vat = 'BG202245000' where id = 1 and company_vat = '';
-- The template has no generic terms block; clear the old default text (custom text is kept).
update public.settings set terms_text = ''
  where id = 1
    and terms_text = 'Prices are in EUR excl. VAT. Lead time and MOQ to be confirmed upon order. Final label text subject to EU regulatory review.';
