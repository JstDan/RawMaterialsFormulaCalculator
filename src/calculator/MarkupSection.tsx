import { Box, FormControlLabel, Grid, Slider, Stack, Switch, Typography } from '@mui/material';
import { NumberField } from '../components/NumberField';
import { Section } from '../components/Section';
import { marginFromMarkup } from '../lib/calc';
import { formatPct, parseNum } from '../lib/numbers';
import { fieldId } from '../lib/validation';
import { t } from '../i18n';
import type { SectionProps } from './sectionProps';

export function MarkupSection({ form, setForm, errorFor }: SectionProps) {
  const markup = parseNum(form.markup) ?? 0;
  const discount = parseNum(form.discount);
  const discountInvalid = form.discount.trim() !== '' && (discount === null || discount < 0 || discount > 100);

  return (
    <Section step={6} title={t.markup.section}>
      <Stack spacing={2.5}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <NumberField
              label={t.markup.markup}
              value={form.markup}
              onChange={(v) => setForm((f) => ({ ...f, markup: v }))}
              suffix="%"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Box sx={{ px: 1 }}>
              <Slider
                aria-label={t.markup.markup}
                value={Math.min(300, Math.max(0, markup))}
                min={0}
                max={300}
                step={1}
                marks={[0, 100, 200, 300].map((v) => ({ value: v, label: `${v}%` }))}
                onChange={(_, v) => setForm((f) => ({ ...f, markup: String(v) }))}
              />
            </Box>
          </Grid>
        </Grid>
        <Box>
          <Typography variant="body2">
            {t.markup.margin}: <b>{formatPct(marginFromMarkup(markup))}</b>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t.markup.markupHint}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <NumberField
              label={t.markup.discount}
              helperText={t.markup.discountHint}
              value={form.discount}
              onChange={(v) => setForm((f) => ({ ...f, discount: v }))}
              id={fieldId('discount')}
              error={discountInvalid || !!errorFor('discount')}
              suffix="%"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel
              control={
                <Switch checked={form.addVat} onChange={(e) => setForm((f) => ({ ...f, addVat: e.target.checked }))} />
              }
              label={t.markup.addVat}
            />
          </Grid>
          {form.addVat && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberField
                label={t.markup.vatRate}
                value={form.vatRate}
                onChange={(v) => setForm((f) => ({ ...f, vatRate: v }))}
                suffix="%"
              />
            </Grid>
          )}
        </Grid>
      </Stack>
    </Section>
  );
}
