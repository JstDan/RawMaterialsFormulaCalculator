import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { NumberField } from '../components/NumberField';
import { Section, SubHeading } from '../components/Section';
import { formatEur, parseNum } from '../lib/numbers';
import type { ExtraItem, ServicePreset } from '../lib/types';
import { fieldId } from '../lib/validation';
import { t } from '../i18n';
import type { SectionProps } from './sectionProps';

interface Props extends SectionProps {
  presets: ServicePreset[];
}

/** Step 7: extra offer lines (certificates, design…), payment terms and the PDF note. */
export function OfferLinesSection({ form, setForm, errorFor, presets }: Props) {
  const error = errorFor('extraItems');

  const addItem = (item: Omit<ExtraItem, 'key'>) =>
    setForm((f) => ({ ...f, extraItems: [...f.extraItems, { key: crypto.randomUUID(), ...item }] }));
  const updateItem = (key: string, patch: Partial<ExtraItem>) =>
    setForm((f) => ({ ...f, extraItems: f.extraItems.map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  const removeItem = (key: string) => setForm((f) => ({ ...f, extraItems: f.extraItems.filter((x) => x.key !== key) }));

  return (
    <Section step={6} title={t.lines.section} id={fieldId('extraItems')}>
      <Stack spacing={2.5}>
        <div>
          <SubHeading>{t.lines.extraItems}</SubHeading>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t.lines.extraHint}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {presets.map((p) => (
              <Button
                key={p.description}
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => addItem({ description: p.description, qty: '1', unit: p.unit, price: String(p.price) })}
              >
                {p.description} · {formatEur(p.price)}
              </Button>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addItem({ description: '', qty: '1', unit: 'pcs.', price: '' })}
            >
              {t.lines.customItem}
            </Button>
          </Stack>

          <Stack spacing={1}>
            {form.extraItems.map((item) => {
              const qty = parseNum(item.qty);
              const price = parseNum(item.price);
              const amount = qty && price !== null ? qty * price : 0;
              const missingDescription = !item.description.trim();
              return (
                <Paper
                  key={item.key}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'grid',
                    gap: 1.5,
                    alignItems: 'center',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1fr) auto', md: 'minmax(0, 1fr) 80px 80px 110px 100px 40px' },
                    gridTemplateAreas: {
                      xs: '"desc desc remove" "qty unit unit" "price amount amount"',
                      md: '"desc qty unit price amount remove"',
                    },
                  }}
                >
                  <Box sx={{ gridArea: 'desc' }}>
                    <TextField
                      label={t.lines.description}
                      value={item.description}
                      onChange={(e) => updateItem(item.key, { description: e.target.value })}
                      error={!!error && missingDescription}
                    />
                  </Box>
                  <Box sx={{ gridArea: 'qty' }}>
                    <NumberField
                      label={t.lines.qty}
                      value={item.qty}
                      onChange={(v) => updateItem(item.key, { qty: v })}
                      error={!!error && !(qty && qty > 0)}
                    />
                  </Box>
                  <Box sx={{ gridArea: 'unit' }}>
                    <TextField label={t.lines.unit} value={item.unit} onChange={(e) => updateItem(item.key, { unit: e.target.value })} />
                  </Box>
                  <Box sx={{ gridArea: 'price' }}>
                    <NumberField
                      label={t.lines.price}
                      value={item.price}
                      onChange={(v) => updateItem(item.key, { price: v })}
                      error={!!error && price === null}
                      suffix="€"
                    />
                  </Box>
                  <Box sx={{ gridArea: 'amount', textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {t.lines.amount}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatEur(amount)}
                    </Typography>
                  </Box>
                  <Box sx={{ gridArea: 'remove', justifySelf: 'end' }}>
                    <Tooltip title={t.formula.remove}>
                      <IconButton aria-label={`${t.formula.remove} ${item.description}`} onClick={() => removeItem(item.key)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
          {error && (
            <FormHelperText error sx={{ mt: 1 }}>
              {error}
            </FormHelperText>
          )}
        </div>

        <Divider />

        <TextField
          label={t.lines.paymentTerms}
          value={form.paymentTerms}
          onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
        />
        <TextField
          label={t.markup.notes}
          helperText={t.markup.notesHint}
          multiline
          minRows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.includeComposition}
              onChange={(e) => setForm((f) => ({ ...f, includeComposition: e.target.checked }))}
            />
          }
          label={t.markup.includeComposition}
        />
      </Stack>
    </Section>
  );
}
