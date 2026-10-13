import { useState, type ChangeEvent } from 'react';
import { Alert, Box, Button, Grid, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import { NumberField } from '../components/NumberField';
import { Section, SubHeading } from '../components/Section';
import { useData } from '../data/DataContext';
import { extractSheetId } from '../lib/materialImport';
import { parseNum } from '../lib/numbers';
import { PRODUCT_TYPES, type ProductType, type Settings } from '../lib/types';
import { t } from '../i18n';
import nutrikalMark from '../assets/brand/logo-nutrikal.png';
import madeByNatureMark from '../assets/brand/logo-madebynature.png';

const MAX_LOGO_BYTES = 500 * 1024;

type PresetDraft = { description: string; unit: string; price: string };

type Draft = Omit<Settings, 'fixed_costs' | 'default_markup' | 'default_vat_rate' | 'service_presets'> & {
  service_presets: PresetDraft[];
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
  service_presets: s.service_presets.map((p) => ({ ...p, price: String(p.price) })),
});

export function SettingsPanel({ onSaved }: { onSaved: (message: string) => void }) {
  const { settings, saveSettings } = useData();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setPreset = (i: number, patch: Partial<PresetDraft>) =>
    setDraft((d) => ({ ...d, service_presets: d.service_presets.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const numbers = {
    capsules_glass: parseNum(draft.fixed_costs.capsules_glass),
    capsules_plastic: parseNum(draft.fixed_costs.capsules_plastic),
    powder: parseNum(draft.fixed_costs.powder),
    markup: parseNum(draft.default_markup),
    vat: parseNum(draft.default_vat_rate),
  };
  const sheetIdOk = !!extractSheetId(draft.google_sheet_url);
  const presetsOk = draft.service_presets.every((p) => p.description.trim() && (parseNum(p.price) ?? -1) >= 0);
  const valid = Object.values(numbers).every((n) => n !== null && n >= 0) && sheetIdOk && presetsOk;

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
        service_presets: draft.service_presets.map((p) => ({
          description: p.description.trim(),
          unit: p.unit.trim(),
          price: parseNum(p.price)!,
        })),
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
          <SubHeading>{t.settings.supplier}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t.settings.companyName} value={draft.company_name} onChange={(e) => set({ company_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label={t.settings.companyId} value={draft.company_id} onChange={(e) => set({ company_id: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label={t.settings.companyVat} value={draft.company_vat} onChange={(e) => set({ company_vat: e.target.value })} />
            </Grid>
            <Grid size={12}>
              <TextField
                label={t.settings.companyAddress}
                value={draft.company_address}
                onChange={(e) => set({ company_address: e.target.value })}
              />
            </Grid>
          </Grid>
        </div>
        <div>
          <SubHeading>{t.settings.bank}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t.settings.bankIban} value={draft.bank_iban} onChange={(e) => set({ bank_iban: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label={t.settings.bankName} value={draft.bank_name} onChange={(e) => set({ bank_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label={t.settings.bankBic} value={draft.bank_bic} onChange={(e) => set({ bank_bic: e.target.value })} />
            </Grid>
            <Grid size={12}>
              <TextField label={t.settings.bankAddress} value={draft.bank_address} onChange={(e) => set({ bank_address: e.target.value })} />
            </Grid>
          </Grid>
        </div>
        <div>
          <SubHeading>{t.settings.offerTexts}</SubHeading>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.settings.paymentTerms}
                value={draft.default_payment_terms}
                onChange={(e) => set({ default_payment_terms: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.settings.vatExemption}
                value={draft.vat_exemption_text}
                onChange={(e) => set({ vat_exemption_text: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t.settings.footerText} value={draft.footer_text} onChange={(e) => set({ footer_text: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={t.settings.websites} value={draft.websites} onChange={(e) => set({ websites: e.target.value })} />
            </Grid>
          </Grid>
        </div>
        <div>
          <SubHeading>{t.settings.presets}</SubHeading>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t.settings.presetsHint}
          </Typography>
          <Stack spacing={1.5}>
            {draft.service_presets.map((p, i) => (
              <Box
                key={i}
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  alignItems: 'center',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1fr) auto', sm: 'minmax(0, 1fr) 90px 120px 40px' },
                  gridTemplateAreas: { xs: '"d d r" "u p p"', sm: '"d u p r"' },
                }}
              >
                <Box sx={{ gridArea: 'd' }}>
                  <TextField
                    label={t.settings.presetDescription}
                    value={p.description}
                    onChange={(e) => setPreset(i, { description: e.target.value })}
                    error={!p.description.trim()}
                  />
                </Box>
                <Box sx={{ gridArea: 'u' }}>
                  <TextField label={t.settings.presetUnit} value={p.unit} onChange={(e) => setPreset(i, { unit: e.target.value })} />
                </Box>
                <Box sx={{ gridArea: 'p' }}>
                  <NumberField
                    label={t.settings.presetPrice}
                    value={p.price}
                    onChange={(v) => setPreset(i, { price: v })}
                    error={parseNum(p.price) === null}
                    suffix="€"
                  />
                </Box>
                <Box sx={{ gridArea: 'r', justifySelf: 'end' }}>
                  <IconButton
                    aria-label={`${t.formula.remove} ${p.description}`}
                    onClick={() => set({ service_presets: draft.service_presets.filter((_, j) => j !== i) })}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Stack>
          <Button
            size="small"
            startIcon={<AddIcon />}
            sx={{ mt: 1 }}
            onClick={() => set({ service_presets: [...draft.service_presets, { description: '', unit: 'pcs.', price: '' }] })}
          >
            {t.settings.addPreset}
          </Button>
        </div>
        <div>
          <SubHeading>{t.settings.logo}</SubHeading>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t.settings.logoHint}
          </Typography>
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
                <Stack direction="row" spacing={1.5}>
                  <Box component="img" src={nutrikalMark} alt="Nutrikal" sx={{ height: 52 }} />
                  <Box component="img" src={madeByNatureMark} alt="MadeByNatureLabs" sx={{ height: 52 }} />
                </Stack>
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
          label={t.sync.sheetUrl}
          value={draft.google_sheet_url}
          onChange={(e) => set({ google_sheet_url: e.target.value })}
          error={!sheetIdOk}
          helperText={sheetIdOk ? t.sync.sheetUrlHint : t.sync.sheetUrlInvalid}
        />
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
