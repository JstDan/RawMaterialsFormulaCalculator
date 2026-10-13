import { useState, type ChangeEvent } from 'react';
import { Alert, Box, Button, Grid, Stack, TextField } from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import { NumberField } from '../components/NumberField';
import { Section, SubHeading } from '../components/Section';
import { useData } from '../data/DataContext';
import { parseNum } from '../lib/numbers';
import { PRODUCT_TYPES, type ProductType, type Settings } from '../lib/types';
import { t } from '../i18n';

const MAX_LOGO_BYTES = 500 * 1024;

type Draft = Omit<Settings, 'fixed_costs' | 'default_markup' | 'default_vat_rate'> & {
  fixed_costs: Record<ProductType, string>;
  default_markup: string;
  default_vat_rate: string;
};

const toDraft = (s: Settings): Draft => ({
  ...s,
  fixed_costs: {
    capsules_glass: String(s.fixed_costs.capsules_glass),
    capsules_plastic: String(s.fixed_costs.capsules_plastic),
    powder: String(s.fixed_costs.powder),
  },
  default_markup: String(s.default_markup),
  default_vat_rate: String(s.default_vat_rate),
});

export function SettingsPanel({ onSaved }: { onSaved: (message: string) => void }) {
  const { settings, saveSettings } = useData();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const numbers = {
    capsules_glass: parseNum(draft.fixed_costs.capsules_glass),
    capsules_plastic: parseNum(draft.fixed_costs.capsules_plastic),
    powder: parseNum(draft.fixed_costs.powder),
    markup: parseNum(draft.default_markup),
    vat: parseNum(draft.default_vat_rate),
  };
  const valid = Object.values(numbers).every((n) => n !== null && n >= 0);

  const pickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) return setError(t.settings.logoTooLarge);
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      set({ logo_data_url: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await saveSettings({
        ...draft,
        fixed_costs: {
          capsules_glass: numbers.capsules_glass!,
          capsules_plastic: numbers.capsules_plastic!,
          powder: numbers.powder!,
        },
        default_markup: numbers.markup!,
        default_vat_rate: numbers.vat!,
      });
      onSaved(t.settings.savedOk);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={t.settings.title}>
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        <div>
          <SubHeading>{t.settings.fixedCosts}</SubHeading>
          <Grid container spacing={2}>
            {PRODUCT_TYPES.map((p) => (
              <Grid key={p} size={{ xs: 12, sm: 4 }}>
                <NumberField
                  label={t.productType[p]}
                  value={draft.fixed_costs[p]}
                  onChange={(v) => set({ fixed_costs: { ...draft.fixed_costs, [p]: v } })}
                  error={numbers[p] === null}
                  suffix="€"
                />
              </Grid>
            ))}
          </Grid>
        </div>
        <div>
          <SubHeading>{t.settings.defaults}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberField
                label={t.settings.defaultMarkup}
                value={draft.default_markup}
                onChange={(v) => set({ default_markup: v })}
                error={numbers.markup === null}
                suffix="%"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberField
                label={t.settings.defaultVat}
                value={draft.default_vat_rate}
                onChange={(v) => set({ default_vat_rate: v })}
                error={numbers.vat === null}
                suffix="%"
              />
            </Grid>
          </Grid>
        </div>
        <div>
          <SubHeading>{t.settings.company}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t.settings.companyName} value={draft.company_name} onChange={(e) => set({ company_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t.settings.companyVat} value={draft.company_vat} onChange={(e) => set({ company_vat: e.target.value })} />
            </Grid>
            <Grid size={12}>
              <TextField
                label={t.settings.companyAddress}
                value={draft.company_address}
                onChange={(e) => set({ company_address: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.settings.companyEmail}
                type="email"
                value={draft.company_email}
                onChange={(e) => set({ company_email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t.settings.companyPhone} value={draft.company_phone} onChange={(e) => set({ company_phone: e.target.value })} />
            </Grid>
          </Grid>
        </div>
        <div>
          <SubHeading>{t.settings.logo}</SubHeading>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Box
              sx={{
                width: 180,
                height: 64,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#fff',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              {draft.logo_data_url ? (
                <Box component="img" src={draft.logo_data_url} alt={t.settings.logo} sx={{ maxWidth: '100%', maxHeight: '100%' }} />
              ) : (
                (draft.company_name || 'Nutrikal').toUpperCase()
              )}
            </Box>
            <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
              {t.settings.uploadLogo}
              <input hidden type="file" accept="image/png,image/jpeg" onChange={pickLogo} />
            </Button>
            {draft.logo_data_url && (
              <Button color="inherit" onClick={() => set({ logo_data_url: null })}>
                {t.settings.removeLogo}
              </Button>
            )}
          </Stack>
        </div>
        <TextField
          label={t.settings.terms}
          multiline
          minRows={3}
          value={draft.terms_text}
          onChange={(e) => set({ terms_text: e.target.value })}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={save} disabled={!valid || busy}>
            {t.settings.saveSettings}
          </Button>
        </Box>
      </Stack>
    </Section>
  );
}
