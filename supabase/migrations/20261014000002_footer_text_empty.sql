-- No footer text on the PDF by default (still editable in Settings).
alter table public.settings alter column footer_text set default '';

-- Clear the old default only where it was never changed.
update public.settings set footer_text = '' where id = 1 and footer_text = 'Thank you for your business!';
