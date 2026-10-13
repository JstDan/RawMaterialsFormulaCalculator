import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import SearchIcon from '@mui/icons-material/Search';
import { NumberField } from '../components/NumberField';
import { InfoLine, Section } from '../components/Section';
import type { CalcResult } from '../lib/calc';
import { formatEur, formatNumber, parseNum } from '../lib/numbers';
import { matchesQuery } from '../lib/search';
import { CAPSULE_SIZES, DOSE_UNITS, isCapsule, type CapsuleSize, type FormulaRow, type RawMaterial } from '../lib/types';
import { fieldId } from '../lib/validation';
import { defaultUnitFor } from '../state/OfferFormContext';
import { t } from '../i18n';
import type { SectionProps } from './sectionProps';

export function RegulatoryBadge({ note }: { note: string }) {
  return (
    <Tooltip title={note} enterTouchDelay={0} leaveTouchDelay={6000} arrow>
      <Chip
        size="small"
        icon={<WarningIcon />}
        label={t.formula.regulatory}
        tabIndex={0}
        aria-label={`${t.formula.regulatory}: ${note}`}
        sx={{ bgcolor: '#fff4e0', color: '#8a5a00', '& .MuiChip-icon': { color: '#d48806' }, cursor: 'help' }}
      />
    </Tooltip>
  );
}

interface Props extends SectionProps {
  materials: RawMaterial[];
  result: CalcResult;
}

export function FormulaSection({ form, setForm, errorFor, touch, materials, result }: Props) {
  const [query, setQuery] = useState('');
  const capsule = isCapsule(form.productType);
  const rowsError = errorFor('rows');
  const capsError = errorFor('capsulesPerDose');

  const active = useMemo(() => materials.filter((m) => m.active), [materials]);
  const byId = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const idCounts = useMemo(() => {
    const counts = new Map<string, number>();
    form.rows.forEach((r) => r.materialId && counts.set(r.materialId, (counts.get(r.materialId) ?? 0) + 1));
    return counts;
  }, [form.rows]);

  const staleRows = form.rows.filter((r) => {
    const m = r.materialId ? byId.get(r.materialId) : undefined;
    return m && (m.price_eur_per_kg !== r.pricePerKg || (m.regulatory_note ?? null) !== r.regulatoryNote);
  });

  const addMaterial = (m: RawMaterial) => {
    setForm((f) => ({
      ...f,
      rows: [
        ...f.rows,
        {
          key: crypto.randomUUID(),
          materialId: m.id,
          name: m.name,
          pricePerKg: m.price_eur_per_kg,
          regulatoryNote: m.regulatory_note,
          amount: '',
          unit: defaultUnitFor(f),
        },
      ],
    }));
    touch('rows');
    // Focus the amount input of the new row once it renders.
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-amount-input]');
      inputs[inputs.length - 1]?.focus();
    }, 0);
  };

  const updateRow = (key: string, patch: Partial<FormulaRow>) =>
    setForm((f) => ({ ...f, rows: f.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const removeRow = (key: string) => setForm((f) => ({ ...f, rows: f.rows.filter((r) => r.key !== key) }));

  const refreshPrices = () =>
    setForm((f) => ({
      ...f,
      rows: f.rows.map((r) => {
        const m = r.materialId ? byId.get(r.materialId) : undefined;
        return m ? { ...r, name: m.name, pricePerKg: m.price_eur_per_kg, regulatoryNote: m.regulatory_note } : r;
      }),
    }));

  const doseG = result.doseWeightMg / 1000;
  const maxFill = parseNum(form.maxFillMg);
  const overfill =
    capsule && result.fillWeightPerCapsuleMg !== null && maxFill !== null && result.fillWeightPerCapsuleMg > maxFill;

  return (
    <Section step={3} title={t.formula.section} id={fieldId('rows')}>
      <Stack spacing={2}>
        <div>
          <Autocomplete<RawMaterial>
            options={active}
            value={null}
            inputValue={query}
            onInputChange={(_, v, reason) => setQuery(reason === 'reset' ? '' : v)}
            onChange={(_, m) => {
              if (m) addMaterial(m);
              setQuery('');
            }}
            filterOptions={(opts, s) => opts.filter((o) => matchesQuery(o.name, s.inputValue))}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={t.formula.noResults}
            blurOnSelect={false}
            clearOnBlur
            size="small"
            renderOption={(props, o) => {
              const { key, ...rest } = props as typeof props & { key: string };
              return (
                <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1, overflowWrap: 'anywhere' }}>
                    {o.name}
                    {idCounts.has(o.id) && (
                      <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                        ({t.formula.duplicate})
                      </Typography>
                    )}
                  </Box>
                  {o.regulatory_note && <WarningIcon fontSize="small" sx={{ color: '#d48806' }} />}
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {formatEur(o.price_eur_per_kg)}/kg
                  </Typography>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t.formula.search}
                placeholder={t.formula.searchPlaceholder}
                slotProps={{
                  ...params.slotProps,
                  input: { ...params.slotProps.input, startAdornment: <SearchIcon color="action" sx={{ ml: 0.5 }} /> },
                }}
              />
            )}
          />
          <FormHelperText sx={{ mx: 0, mt: 1 }}>{t.formula.helper}</FormHelperText>
          {!form.productType && <FormHelperText sx={{ mx: 0 }}>{t.formula.selectTypeFirst}</FormHelperText>}
        </div>

        {staleRows.length > 0 && (
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={refreshPrices}>
                {t.formula.updatePrices}
              </Button>
            }
          >
            {t.formula.pricesChanged}
          </Alert>
        )}

        {form.rows.length === 0 ? (
          <Typography
            variant="body2"
            color={rowsError ? 'error' : 'text.secondary'}
            sx={{ py: 3, textAlign: 'center', border: 1, borderStyle: 'dashed', borderColor: rowsError ? 'error.main' : 'divider', borderRadius: 1 }}
          >
            {t.formula.empty}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {form.rows.map((row, i) => {
              const dup = !!row.materialId && (idCounts.get(row.materialId) ?? 0) > 1;
              const amountInvalid = row.amount.trim() !== '' && (parseNum(row.amount) ?? 0) <= 0;
              return (
                <Paper
                  key={row.key}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderColor: dup ? 'warning.main' : 'divider',
                    bgcolor: dup ? 'rgba(237, 108, 2, 0.04)' : 'background.paper',
                    display: 'grid',
                    gap: 1.5,
                    alignItems: 'center',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                      md: 'minmax(0, 1fr) 120px 84px 96px 96px 40px',
                    },
                    gridTemplateAreas: {
                      xs: '"name name remove" "amount unit unit" "price cost cost"',
                      md: '"name amount unit price cost remove"',
                    },
                  }}
                >
                  <Box sx={{ gridArea: 'name' }}>
                    <Typography sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{row.name}</Typography>
                    {(row.regulatoryNote || dup) && (
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                        {row.regulatoryNote && <RegulatoryBadge note={row.regulatoryNote} />}
                        {dup && <Chip size="small" color="warning" variant="outlined" label={t.formula.duplicate} />}
                      </Stack>
                    )}
                  </Box>
                  <Box sx={{ gridArea: 'amount' }}>
                    <NumberField
                      label={t.formula.amount}
                      value={row.amount}
                      onChange={(v) => updateRow(row.key, { amount: v })}
                      error={amountInvalid}
                      slotProps={{ htmlInput: { 'data-amount-input': true, 'aria-label': `${t.formula.amount} – ${row.name}` } }}
                    />
                  </Box>
                  <Box sx={{ gridArea: 'unit' }}>
                    <TextField
                      select
                      label={t.formula.unit}
                      value={row.unit}
                      onChange={(e) => updateRow(row.key, { unit: e.target.value as FormulaRow['unit'] })}
                    >
                      {DOSE_UNITS.map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Box sx={{ gridArea: 'price', textAlign: { xs: 'left', md: 'right' } }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {t.formula.pricePerKg}
                    </Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatEur(row.pricePerKg)}
                    </Typography>
                  </Box>
                  <Box sx={{ gridArea: 'cost', textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {t.formula.costPerDose}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatEur(result.rowCostsPerDose[i] ?? 0, 4)}
                    </Typography>
                  </Box>
                  <Box sx={{ gridArea: 'remove', justifySelf: 'end' }}>
                    <Tooltip title={t.formula.remove}>
                      <IconButton aria-label={`${t.formula.remove} ${row.name}`} onClick={() => removeRow(row.key)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
        {rowsError && <FormHelperText error>{rowsError}</FormHelperText>}

        {capsule && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberField
                id={fieldId('capsulesPerDose')}
                integer
                label={t.formula.capsulesPerDose}
                value={form.capsulesPerDose}
                onChange={(v) => setForm((f) => ({ ...f, capsulesPerDose: v }))}
                onBlur={() => touch('capsulesPerDose')}
                error={!!capsError}
                helperText={capsError}
              />
            </Grid>
            <Grid size={{ xs: 7, sm: 4 }}>
              <TextField
                select
                label={t.formula.capsuleSize}
                value={form.capsuleSize}
                onChange={(e) => {
                  const size = e.target.value as CapsuleSize;
                  setForm((f) => ({ ...f, capsuleSize: size, maxFillMg: String(CAPSULE_SIZES[size]) }));
                }}
              >
                {(Object.keys(CAPSULE_SIZES) as CapsuleSize[]).map((s) => (
                  <MenuItem key={s} value={s}>
                    {t.formula[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 5, sm: 4 }}>
              <NumberField
                label={t.formula.maxFill}
                value={form.maxFillMg}
                onChange={(v) => setForm((f) => ({ ...f, maxFillMg: v }))}
              />
            </Grid>
          </Grid>
        )}
        {overfill && (
          <Alert severity="warning" icon={<WarningIcon />}>
            {t.formula.overfill}
          </Alert>
        )}

        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 2, py: 1 }}>
          <InfoLine
            label={t.formula.totalDoseWeight}
            value={`${formatNumber(result.doseWeightMg, 3)} mg · ${formatNumber(doseG, 4)} g`}
          />
          {capsule && result.fillWeightPerCapsuleMg !== null && (
            <InfoLine label={t.formula.fillWeight} value={`${formatNumber(result.fillWeightPerCapsuleMg, 1)} mg`} />
          )}
          {form.productType === 'powder' && (
            <InfoLine label={t.formula.scoopSize} value={`${formatNumber(doseG, 3)} g`} />
          )}
          <InfoLine label={t.formula.rawCostPerDose} value={formatEur(result.costPerDose, 4)} strong />
        </Box>
      </Stack>
    </Section>
  );
}
