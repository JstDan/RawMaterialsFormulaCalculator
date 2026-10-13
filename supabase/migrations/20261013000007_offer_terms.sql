-- Standard terms printed in the TERMS block of every PDF offer (editable in Settings).
update public.settings
set terms_text = 'The prices are EUR/EXW excl. VAT, for the finished, ready-to-sell products and include raw materials, primary packaging materials, mixing, quality assurance, encapsulation where applicable, filling, sealing, capping where applicable, label and foil printing with basic effects, label application and shipment preparation. Lead time and MOQ to be confirmed upon order.'
where id = 1;
