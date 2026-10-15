import { Autocomplete, Grid, TextField } from '@mui/material';
import { Section } from '../components/Section';
import { SALES_PERSONS } from '../lib/salesPersons';
import type { OfferForm } from '../lib/types';
import { t } from '../i18n';
import type { SectionProps } from './sectionProps';

/** Step 1: Nutrikal contact person for the offer (name, phone) and the shared sales email. */
export function ContactSection({ form, setForm, email }: SectionProps & { email: string }) {
  const setContact = (patch: Partial<OfferForm['contact']>) =>
    setForm((f) => ({ ...f, contact: { ...f.contact, ...patch } }));
  const c = form.contact;

  return (
    <Section step={1} title={t.contact.section}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 5 }}>
          <Autocomplete
            freeSolo
            options={SALES_PERSONS.map((p) => p.name)}
            value={c.name}
            inputValue={c.name}
            onInputChange={(_, v) => setContact({ name: v })}
            onChange={(_, v) => {
              // Picking a sales person fills in their phone number.
              const person = SALES_PERSONS.find((p) => p.name === v);
              setContact(person ? { name: person.name, phone: person.phone } : { name: v ?? '' });
            }}
            openOnFocus
            renderInput={(params) => <TextField {...params} label={t.contact.name} autoComplete="off" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label={t.contact.phone}
            type="tel"
            value={c.phone}
            onChange={(e) => setContact({ phone: e.target.value })}
            autoComplete="off"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField label={t.contact.email} value={email} slotProps={{ input: { readOnly: true } }} />
        </Grid>
      </Grid>
    </Section>
  );
}
