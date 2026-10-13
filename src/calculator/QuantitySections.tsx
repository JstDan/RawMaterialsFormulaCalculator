import { Alert, Box, Grid, Typography } from '@mui/material';
import { NumberField } from '../components/NumberField';
import { InfoLine, Section } from '../components/Section';
import type { CalcResult } from '../lib/calc';
import { formatNumber } from '../lib/numbers';
import { isCapsule } from '../lib/types';
import { fieldId } from '../lib/validation';
import { t } from '../i18n';
import type { SectionProps } from './sectionProps';

export function quantityLabel(type: string | null) {
  return type === 'powder' ? t.quantity.dosesPerPouch : t.quantity.capsulesPerJar;
}

export function unitsLabel(type: string | null) {
  if (!type) return t.units.units;
  return type === 'powder' ? t.units.pouches : t.units.jars;
}

export function QuantitySection({ form, setForm, errorFor, touch, result }: SectionProps & { result: CalcResult }) {
  const capsule = isCapsule(form.productType);
  const error = errorFor('quantityPerUnit');
  const notWhole = capsule && result.dosesPerUnit !== null && !Number.isInteger(result.dosesPerUnit);

  return (
    <Section step={4} title={t.quantity.section}>
      <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberField
            id={fieldId('quantityPerUnit')}
            integer
            required
            label={quantityLabel(form.productType)}
            value={form.quantityPerUnit}
            onChange={(v) => setForm((f) => ({ ...f, quantityPerUnit: v }))}
            onBlur={() => touch('quantityPerUnit')}
            error={!!error}
            helperText={error ?? (!form.productType ? t.quantity.selectType : undefined)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 2, py: 0.5 }}>
            {capsule && (
              <InfoLine
                label={t.quantity.dosesPerJar}
                value={result.dosesPerUnit !== null ? formatNumber(result.dosesPerUnit, 2) : '–'}
              />
            )}
            {form.productType === 'powder' && (
              <InfoLine
                label={t.quantity.netWeight}
                value={result.netWeightPerPouchG !== null ? `${formatNumber(result.netWeightPerPouchG, 2)} g` : '–'}
              />
            )}
            {!form.productType && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 0.75 }}>
                {t.quantity.selectType}
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
      {notWhole && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t.quantity.notWhole}
        </Alert>
      )}
    </Section>
  );
}

export function UnitsSection({ form, setForm, errorFor, touch }: SectionProps) {
  const error = errorFor('numberOfUnits');
  return (
    <Section step={5} title={t.units.section}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberField
            id={fieldId('numberOfUnits')}
            integer
            required
            label={unitsLabel(form.productType)}
            value={form.numberOfUnits}
            onChange={(v) => setForm((f) => ({ ...f, numberOfUnits: v }))}
            onBlur={() => touch('numberOfUnits')}
            error={!!error}
            helperText={error}
          />
        </Grid>
      </Grid>
    </Section>
  );
}
