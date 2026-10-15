import { Alert, Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import PdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { InfoLine, Section, SubHeading } from '../components/Section';
import type { CalcResult, OfferLine, RequirementLine } from '../lib/calc';
import { formatEur, formatNumber, formatPct, parseNum } from '../lib/numbers';
import { isCapsule, type OfferForm } from '../lib/types';
import { packagingLabel, productTypeLabel } from './ProductTypeSection';
import { quantityLabel, unitsLabel } from './QuantitySections';
import { t } from '../i18n';

interface Props {
  form: OfferForm;
  result: CalcResult;
  valid: boolean;
  busy: boolean;
  onSave: () => void;
  onDownloadPdf?: () => void;
  /** Called when a disabled action is clicked: reveal errors and scroll to the first one. */
  onInvalidAttempt: () => void;
}

function formatKg(kg: number): string {
  if (kg > 0 && kg < 1) return `${formatNumber(kg * 1000, 2)} g`;
  return `${formatNumber(kg, 3)} kg`;
}

export function ResultsSection({ form, result, valid, busy, onSave, onDownloadPdf, onInvalidAttempt }: Props) {
  const r = result;
  const type = form.productType;
  const units = parseNum(form.numberOfUnits) ?? 0;
  const markup = parseNum(form.markup) ?? 0;
  const discount = Math.min(100, Math.max(0, parseNum(form.discount) ?? 0));

  const requirementRows = r.requirements.map((line, i) => ({ ...line, key: form.rows[i]?.key ?? String(i) }));

  return (
    <Section title={t.results.section}>
      {!r.complete && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t.results.incomplete}
        </Alert>
      )}
      <Stack spacing={3}>
        {/* A) Internal breakdown – never goes to the PDF */}
        <Paper variant="outlined" sx={(theme) => ({
            p: { xs: 1.5, sm: 2 },
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(240, 217, 168, 0.06)' : '#fffaf0',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(240, 217, 168, 0.3)' : '#f0d9a8',
          })}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h3" component="h3">
              A) {t.results.internalTitle}
            </Typography>
            <Chip size="small" icon={<LockIcon />} label={t.results.internal} color="warning" variant="outlined" />
          </Stack>
          <Grid container spacing={{ xs: 0, sm: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoLine label={t.results.rawCostPerDose} value={formatEur(r.costPerDose, 4)} />
              <InfoLine
                label={t.results.dosesPerUnit}
                value={r.dosesPerUnit !== null ? formatNumber(r.dosesPerUnit, 2) : '–'}
              />
              <InfoLine label={t.results.rawCostPerUnit} value={formatEur(r.rawCostPerUnit, 4)} />
              <InfoLine label={t.results.fixedCostPerUnit} value={formatEur(r.fixedCostPerUnit)} />
              <InfoLine label={t.results.unitCost} value={formatEur(r.unitCost, 4)} strong />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoLine label={t.results.markupMargin} value={`${formatPct(markup)} / ${formatPct(r.marginPct)}`} />
              <InfoLine label={t.results.totalCost} value={formatEur(r.totalCost)} />
              <InfoLine label={t.results.totalProfit} value={formatEur(r.profit)} strong />
              {r.discountAmount > 0 && <InfoLine label={t.results.discountGiven} value={formatEur(r.discountAmount)} />}
              {r.extrasTotal > 0 && <InfoLine label={t.results.extrasTotal} value={formatEur(r.extrasTotal)} />}
            </Grid>
          </Grid>

          {form.rows.length > 0 && (
            <Box sx={{ mt: 2.5 }}>
              <SubHeading>{t.results.requirement}</SubHeading>
              <ResponsiveTable<RequirementLine & { key: string }>
                rows={requirementRows}
                getKey={(row) => row.key}
                columns={[
                  { key: 'name', label: t.formula.material, render: (row) => row.name, primary: true },
                  {
                    key: 'kg',
                    label: t.results.requirementKg,
                    render: (row) => formatKg(row.totalKg),
                    align: 'right',
                    width: '22%',
                  },
                  {
                    key: 'cost',
                    label: t.results.requirementCost,
                    render: (row) => formatEur(row.cost),
                    align: 'right',
                    width: '22%',
                  },
                ]}
                footer={[t.results.requirementTotal, '', formatEur(r.requirementsTotalCost)]}
              />
            </Box>
          )}
        </Paper>

        {/* B) Client offer summary – what the client sees */}
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderColor: 'primary.main' }}>
          <Typography variant="h3" component="h3" sx={{ mb: 1.5 }}>
            B) {t.results.client}
          </Typography>
          <Grid container spacing={{ xs: 0, sm: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoLine label={t.results.product} value={form.offer.productName || '–'} />
              <InfoLine label={t.results.type} value={type ? productTypeLabel(type) : '–'} />
              <InfoLine label={t.results.packaging} value={type ? packagingLabel(type) : '–'} />
              <InfoLine label={quantityLabel(type)} value={form.quantityPerUnit || '–'} />
              {isCapsule(type) && <InfoLine label={t.formula.capsulesPerDose} value={form.capsulesPerDose || '–'} />}
              <InfoLine label={`${t.results.quantity} (${unitsLabel(type).toLowerCase()})`} value={units ? formatNumber(units) : '–'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoLine label={t.results.unitPrice} value={formatEur(r.unitPrice)} />
              {discount > 0 && <InfoLine label={t.results.discount} value={formatPct(discount, 2)} />}
              <InfoLine label={t.results.subTotal} value={formatEur(r.totalPriceExclVat)} strong />
            </Grid>
          </Grid>

          {r.complete && (
            <Box sx={{ mt: 2 }}>
              <SubHeading>{t.results.offerLines}</SubHeading>
              <ResponsiveTable<OfferLine & { key: string }>
                rows={[
                  {
                    key: 'product',
                    description: type ? `${form.offer.productName || productTypeLabel(type)}` : '–',
                    qty: units,
                    unit: 'pcs',
                    price: r.unitPrice,
                    discountPct: discount,
                    amount: r.productAmount,
                  },
                  ...r.extraLines.map((l, i) => ({ ...l, key: `x${i}` })),
                ]}
                getKey={(l) => l.key}
                columns={[
                  { key: 'd', label: t.lines.description, primary: true, render: (l) => l.description },
                  { key: 'q', label: t.lines.qty, width: 70, align: 'right', render: (l) => `${formatNumber(l.qty)} ${l.unit}` },
                  { key: 'p', label: t.lines.price, width: 100, align: 'right', render: (l) => formatEur(l.price) },
                  { key: 'a', label: t.lines.amount, width: 110, align: 'right', render: (l) => formatEur(l.amount) },
                ]}
              />
            </Box>
          )}
        </Paper>

        <Box>
          {!valid && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {t.results.fixErrors}
            </Alert>
          )}
          {/* Disabled buttons don't receive clicks, so the wrapper catches them to reveal what's missing. */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            onClick={() => !valid && onInvalidAttempt()}
            sx={{ justifyContent: 'flex-end', cursor: valid ? 'default' : 'not-allowed' }}
          >
            <Button variant="outlined" size="large" startIcon={<SaveIcon />} disabled={!valid || busy} onClick={onSave}>
              {form.id ? t.results.updateOffer : t.results.saveOffer}
            </Button>
            {onDownloadPdf && (
              <Button
                variant="contained"
                size="large"
                startIcon={<PdfIcon />}
                disabled={!valid || busy}
                onClick={onDownloadPdf}
              >
                {t.results.downloadPdf}
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>
    </Section>
  );
}
