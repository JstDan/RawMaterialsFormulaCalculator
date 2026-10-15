import { Box, Button, FormControlLabel, Grid, IconButton, Paper, Slider, Stack, Switch, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { NumberField } from '../components/NumberField';
import { Section, SubHeading } from '../components/Section';
import { marginFromMarkup, type CalcResult } from '../lib/calc';
import { formatEur, formatNumber, formatPct, parseNum } from '../lib/numbers';
import type { PriceTier } from '../lib/types';
import { fieldId } from '../lib/validation';
import { fmt, t } from '../i18n';
import { unitsLabel } from './QuantitySections';
import type { SectionProps } from './sectionProps';

/** Step 5: number of units, markup, discount, VAT and optional price tiers for other quantities. */
export function MarkupSection({ form, setForm, errorFor, touch, result }: SectionProps & { result: CalcResult }) {
  const markup = parseNum(form.markup) ?? 0;
  const discount = parseNum(form.discount);
  const discountInvalid = form.discount.trim() !== '' && (discount === null || discount < 0 || discount > 100);
  const unitsError = errorFor('numberOfUnits');

  // Guideline price per unit from the current cost and markup (the same rounding as the offer).
  const unitCost = result.unitCost;
  const guidePrice = form.productType && unitCost > 0 ? Math.round(unitCost * (1 + markup / 100) * 100) / 100 : null;

  const addTier = () =>
    setForm((f) => ({ ...f, priceTiers: [...f.priceTiers, { key: crypto.randomUUID(), qty: '', total: '' }] }));
  const updateTier = (key: string, patch: Partial<PriceTier>) =>
    setForm((f) => ({ ...f, priceTiers: f.priceTiers.map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  const removeTier = (key: string) => setForm((f) => ({ ...f, priceTiers: f.priceTiers.filter((x) => x.key !== key) }));

  return (
    <Section step={5} title={t.markup.section}>
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

        <Box>
          {form.priceTiers.length > 0 && (
            <>
              <SubHeading>{t.markup.tiers}</SubHeading>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t.markup.tiersHint}
              </Typography>
              <Stack spacing={1} sx={{ mb: 1.5 }}>
                {form.priceTiers.map((tier) => {
                  const qty = parseNum(tier.qty);
                  const total = parseNum(tier.total);
                  // Price per unit follows from the total the user enters.
                  const perUnit = total !== null && qty ? total / qty : null;
                  const margin = perUnit && perUnit > 0 ? ((perUnit - unitCost) / perUnit) * 100 : null;
                  const guideTotal = guidePrice !== null && qty ? guidePrice * qty : null;
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
                            calculator
                            label={t.markup.tierTotal}
                            value={tier.total}
                            onChange={(v) => updateTier(tier.key, { total: v })}
                            placeholder={guideTotal !== null ? guideTotal.toFixed(2) : undefined}
                            suffix="€"
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
                          {guidePrice === null ? (
                            <Typography variant="caption" color="text.secondary">
                              {t.markup.tierNeedsFormula}
                            </Typography>
                          ) : (
                            <>
                              <Typography variant="caption" color="text.secondary" component="div">
                                {fmt(t.markup.tierGuide, {
                                  total: formatEur(guideTotal ?? 0),
                                  qty: formatNumber(qty ?? 0, 0),
                                  price: formatEur(guidePrice),
                                })}
                              </Typography>
                              {perUnit !== null && margin !== null && (
                                <Typography
                                  variant="caption"
                                  component="div"
                                  sx={{ color: margin < 0 ? 'error.main' : 'text.secondary' }}
                                >
                                  {fmt(t.markup.tierAtPrice, { price: formatEur(perUnit, 4), margin: formatPct(margin) })}
                                </Typography>
                              )}
                            </>
                          )}
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
