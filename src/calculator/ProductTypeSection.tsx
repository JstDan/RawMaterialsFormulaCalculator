import { Box, FormHelperText, Paper, Radio, Stack, Typography } from '@mui/material';
import { Section } from '../components/Section';
import { formatEur } from '../lib/numbers';
import { PRODUCT_TYPES, isCapsule, type FixedCosts, type ProductType } from '../lib/types';
import { fieldId } from '../lib/validation';
import { t } from '../i18n';
import type { SectionProps } from './sectionProps';

export const productTypeLabel = (p: ProductType) => t.productType[p];
export const packagingLabel = (p: ProductType) => t.productType[`packaging_${p}`];

export function ProductTypeSection({ form, setForm, errorFor, fixedCosts }: SectionProps & { fixedCosts: FixedCosts }) {
  const error = errorFor('productType');

  const select = (p: ProductType) =>
    setForm((f) => {
      // Switching between capsules and powder: rows without an amount follow the new default unit.
      const unitChanged = isCapsule(p) !== isCapsule(f.productType) || !f.productType;
      const unit = p === 'powder' ? 'g' : 'mg';
      return {
        ...f,
        productType: p,
        rows: unitChanged ? f.rows.map((r) => (r.amount.trim() ? r : { ...r, unit })) : f.rows,
      };
    });

  return (
    <Section step={3} title={t.productType.section} id={fieldId('productType')} required>
      <Box
        role="radiogroup"
        aria-label={t.productType.section}
        sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' } }}
      >
        {PRODUCT_TYPES.map((p) => {
          const selected = form.productType === p;
          return (
            <Paper
              key={p}
              variant="outlined"
              onClick={() => select(p)}
              sx={{
                p: 1.5,
                cursor: 'pointer',
                borderWidth: 2,
                borderColor: selected ? 'primary.main' : error ? 'error.main' : 'divider',
                bgcolor: selected ? 'rgba(27, 122, 75, 0.06)' : 'background.paper',
                transition: 'border-color 120ms',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Radio
                  checked={selected}
                  onChange={() => select(p)}
                  value={p}
                  slotProps={{ input: { 'aria-label': productTypeLabel(p) } }}
                  sx={{ p: 0.25 }}
                />
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{productTypeLabel(p)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.productType.packaging}: {packagingLabel(p)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.productType.fixedCost}: <b>{formatEur(fixedCosts[p])}</b>
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Box>
      <FormHelperText error={!!error} sx={{ mt: 1 }}>
        {error ?? t.productType.fixedCostHint}
      </FormHelperText>
    </Section>
  );
}
