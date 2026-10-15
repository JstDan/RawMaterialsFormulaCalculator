import { Autocomplete, Grid, Stack, TextField } from '@mui/material';
import { Section, SubHeading } from '../components/Section';
import { COUNTRIES, type CountryOption } from '../lib/countries';
import { fieldId } from '../lib/validation';
import type { OfferForm } from '../lib/types';
import { t } from '../i18n';
import type { SectionProps } from './sectionProps';

export function ClientSection({ form, setForm, errorFor, touch }: SectionProps) {
  const setReceiver = (patch: Partial<OfferForm['receiver']>) =>
    setForm((f) => ({ ...f, receiver: { ...f.receiver, ...patch } }));
  const setInvoice = (patch: Partial<OfferForm['invoice']>) =>
    setForm((f) => ({ ...f, invoice: { ...f.invoice, ...patch } }));
  const setOffer = (patch: Partial<OfferForm['offer']>) => setForm((f) => ({ ...f, offer: { ...f.offer, ...patch } }));

  const r = form.receiver;
  const nameError = errorFor('receiver.fullName');
  const emailError = errorFor('receiver.email');
  const country = COUNTRIES.find((c) => c.name === r.country) ?? (r.country ? { name: r.country, group: 'other' } : null);

  return (
    <Section step={2} title={t.client.section}>
      <Stack spacing={3}>
        <div>
          <SubHeading>{t.client.receiver}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id={fieldId('receiver.fullName')}
                label={t.client.fullName}
                required
                value={r.fullName}
                onChange={(e) => setReceiver({ fullName: e.target.value })}
                onBlur={() => touch('receiver.fullName')}
                error={!!nameError}
                helperText={nameError}
                autoComplete="off"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id={fieldId('receiver.email')}
                label={t.client.email}
                type="email"
                required
                value={r.email}
                onChange={(e) => setReceiver({ email: e.target.value })}
                onBlur={() => touch('receiver.email')}
                error={!!emailError}
                helperText={emailError}
                autoComplete="off"
              />
            </Grid>
            <Grid size={12}>
              <TextField label={t.client.address} value={r.address} onChange={(e) => setReceiver({ address: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField label={t.client.city} value={r.city} onChange={(e) => setReceiver({ city: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label={t.client.zip} value={r.zip} onChange={(e) => setReceiver({ zip: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete<CountryOption>
                options={COUNTRIES}
                value={country}
                groupBy={(o) => (o.group === 'eu' ? t.client.euCountries : t.client.otherCountries)}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.name === b.name}
                onChange={(_, v) => setReceiver({ country: v?.name ?? '' })}
                renderInput={(params) => <TextField {...params} label={t.client.country} />}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.client.phone}
                type="tel"
                value={r.phone}
                onChange={(e) => setReceiver({ phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </div>

        <div>
          <SubHeading>{t.client.invoice}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.client.companyName}
                value={form.invoice.companyName}
                onChange={(e) => setInvoice({ companyName: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.client.identificationNo}
                value={form.invoice.identificationNo}
                onChange={(e) => setInvoice({ identificationNo: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.client.vatNumber}
                value={form.invoice.vatNumber}
                onChange={(e) => setInvoice({ vatNumber: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label={t.client.registrationAddress}
                value={form.invoice.registrationAddress}
                onChange={(e) => setInvoice({ registrationAddress: e.target.value })}
              />
            </Grid>
          </Grid>
        </div>

        <div>
          <SubHeading>{t.client.offerDetails}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t.client.offerNo}
                value={form.offer.offerNo}
                onChange={(e) => setOffer({ offerNo: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label={t.client.offerDate}
                type="date"
                value={form.offer.offerDate}
                onChange={(e) => setOffer({ offerDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label={t.client.validUntil}
                type="date"
                value={form.offer.validUntil}
                onChange={(e) => setOffer({ validUntil: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label={t.client.productName}
                placeholder={t.client.productNamePlaceholder}
                value={form.offer.productName}
                onChange={(e) => setOffer({ productName: e.target.value })}
              />
            </Grid>
          </Grid>
        </div>
      </Stack>
    </Section>
  );
}
