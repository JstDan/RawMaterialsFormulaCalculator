import { Box, Button, Grid, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { NumberField } from '../components/NumberField';
import { Section, SubHeading } from '../components/Section';
import { marginFromMarkup, unitPriceFor, type CalcResult } from '../lib/calc';
import { formatEur, formatPct, parseNum } from '../lib/numbers';
import type { PriceTier } from '../lib/types';
import { fieldId } from '../lib/validation';
import { fmt, t } from '../i18n';
import { unitsLabel } from './QuantitySections';
import type { SectionProps } from './sectionProps';

/** Step 6: number of units, markup, discount and optional price tiers for other quantities. Prices are excl. VAT. */
export function MarkupSection({ form, setForm, errorFor, touch, result }: SectionProps & { result: CalcResult }) {
  const markup = parseNum(form.markup) ?? 0;
  const discount = parseNum(form.discount);
  const discountInvalid = form.discount.trim() !== '' && (discount === null || discount < 0 || discount > 100);
  const unitsError = errorFor('numberOfUnits');
  const unitCost = result.unitCost;
  const costKnown = !!form.productType && unitCost > 0;

  const addTier = () =>
    setForm((f) => ({ ...f, priceTiers: [...f.priceTiers, { key: crypto.randomUUID(), qty: '', markup: '' }] }));
  const updateTier = (key: string, patch: Partial<PriceTier>) =>
    setForm((f) => ({ ...f, priceTiers: f.priceTiers.map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  const removeTier = (key: string) => setForm((f) => ({ ...f, priceTiers: f.priceTiers.filter((x) => x.key !== key) }));

  return (
    <Section step={6} title={t.markup.section}>
      <Stack spacing={2.5}>
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
              error={!!unitsError}
              helperText={unitsError}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <NumberField
              label={t.markup.markup}
              value={form.markup}
              onChange={(v) => setForm((f) => ({ ...f, markup: v }))}
              suffix="%"
            />
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

        <Box>
          {form.priceTiers.length > 0 && (
            <>
              <SubHeading>{t.markup.tiers}</SubHeading>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t.markup.tiersHint}
              </Typography>
              <Stack spacing={1} sx={{ mb: 1.5 }}>
                {form.priceTiers.map((tier) => {
                  const tierMarkup = parseNum(tier.markup);
                  const price = costKnown && tierMarkup !== null ? unitPriceFor(unitCost, tierMarkup) : null;
                  return (
                    <Paper key={tier.key} variant="outlined" sx={{ p: 1.5 }}>
                      <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Grid size={{ xs: 5, sm: 3 }}>
                          <NumberField
                            size="small"
                            integer
                            label={t.markup.tierQty}
                            value={tier.qty}
                            onChange={(v) => updateTier(tier.key, { qty: v })}
                            suffix="pcs"
                          />
                        </Grid>
                        <Grid size={{ xs: 5, sm: 3 }}>
                          <NumberField
                            size="small"
                            label={t.markup.markup}
                            value={tier.markup}
                            onChange={(v) => updateTier(tier.key, { markup: v })}
                            suffix="%"
                          />
                        </Grid>
                        <Grid size={{ xs: 2, sm: 1 }} sx={{ order: { sm: 3 }, textAlign: 'right' }}>
                          <Tooltip title={t.markup.removeTier}>
                            <IconButton aria-label={t.markup.removeTier} onClick={() => removeTier(tier.key)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                          {!costKnown ? (
                            <Typography variant="caption" color="text.secondary">
                              {t.markup.tierNeedsFormula}
                            </Typography>
                          ) : price !== null && tierMarkup !== null ? (
                            <>
                              <Typography variant="caption" color="text.secondary" component="div">
                                {fmt(t.markup.tierPrice, { price: formatEur(price) })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" component="div">
                                {t.markup.margin}: {formatPct(marginFromMarkup(tierMarkup))}
                              </Typography>
                            </>
                          ) : null}
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                })}
              </Stack>
            </>
          )}
          <Button size="small" startIcon={<AddIcon />} onClick={addTier}>
            {t.markup.addTier}
          </Button>
        </Box>
      </Stack>
    </Section>
  );
}
