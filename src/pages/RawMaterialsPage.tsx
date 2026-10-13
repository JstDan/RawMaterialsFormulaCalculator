import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { NumberField } from '../components/NumberField';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { useData } from '../data/DataContext';
import { AddMaterialDialog } from '../materials/AddMaterialDialog';
import { ImportDialog } from '../materials/ImportDialog';
import { SettingsPanel } from '../materials/SettingsPanel';
import { SyncCard } from '../materials/SyncCard';
import { parseNum } from '../lib/numbers';
import { matchesQuery } from '../lib/search';
import type { RawMaterial } from '../lib/types';
import { fmt, t } from '../i18n';

type Toast = { severity: 'success' | 'error'; message: string } | null;
type Patch = Partial<Pick<RawMaterial, 'price_eur_per_kg' | 'regulatory_note' | 'active'>>;

/** Price input that saves on blur / Enter when the value changed. */
function PriceCell({ material, onSave }: { material: RawMaterial; onSave: (p: Patch) => void }) {
  const [value, setValue] = useState(String(material.price_eur_per_kg));
  const [seen, setSeen] = useState(material.price_eur_per_kg);
  if (seen !== material.price_eur_per_kg) {
    setSeen(material.price_eur_per_kg);
    setValue(String(material.price_eur_per_kg));
  }
  const n = parseNum(value);
  const invalid = n === null || n < 0;
  const commit = () => {
    if (invalid) return setValue(String(material.price_eur_per_kg));
    if (n !== material.price_eur_per_kg) onSave({ price_eur_per_kg: n });
  };
  return (
    <NumberField
      value={value}
      onChange={setValue}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      error={invalid}
      suffix="€"
      sx={{ maxWidth: { xs: 150, md: 'none' } }}
      slotProps={{ htmlInput: { 'aria-label': `${t.materials.price} – ${material.name}` } }}
    />
  );
}

function NoteCell({ material, onSave }: { material: RawMaterial; onSave: (p: Patch) => void }) {
  const current = material.regulatory_note ?? '';
  const [value, setValue] = useState(current);
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setValue(current);
  }
  return (
    <TextField
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value.trim() !== current && onSave({ regulatory_note: value.trim() || null })}
      multiline
      maxRows={4}
      placeholder="–"
      sx={value ? { '& textarea': { color: '#8a5a00' } } : undefined}
      slotProps={{ htmlInput: { 'aria-label': `${t.materials.note} – ${material.name}` } }}
    />
  );
}

export function RawMaterialsPage() {
  const { repo, materials, setMaterials, reloadMaterials } = useData();
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const filtered = useMemo(
    () => materials.filter((m) => (showInactive || m.active) && matchesQuery(m.name, query)),
    [materials, showInactive, query],
  );

  const update = async (m: RawMaterial, patch: Patch) => {
    try {
      const updated = await repo.updateMaterial(m.id, patch);
      setMaterials((list) => list.map((x) => (x.id === m.id ? updated : x)));
      setToast({ severity: 'success', message: `${t.common.save}: ${m.name}` });
    } catch (e) {
      setToast({ severity: 'error', message: (e as Error).message });
    }
  };

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h1">{t.materials.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {fmt(t.materials.count, { n: materials.filter((m) => m.active).length })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportOpen(true)}>
            {t.materials.import}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            {t.materials.add}
          </Button>
        </Stack>
      </Stack>

      <SyncCard onSynced={(message, ok) => setToast({ severity: ok ? 'success' : 'error', message })} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField
          placeholder={t.materials.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': t.materials.searchPlaceholder },
          }}
        />
        <FormControlLabel
          sx={{ flexShrink: 0 }}
          control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
          label={t.materials.showInactive}
        />
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ResponsiveTable<RawMaterial>
          rows={filtered}
          getKey={(m) => m.id}
          empty={t.formula.noResults}
          columns={[
            {
              key: 'name',
              label: t.materials.name,
              primary: true,
              width: '32%',
              render: (m) => (
                <Box component="span" sx={{ color: m.active ? 'text.primary' : 'text.disabled', fontWeight: 500 }}>
                  {m.name}
                </Box>
              ),
            },
            {
              key: 'price',
              label: t.materials.price,
              width: 150,
              align: 'right',
              render: (m) => <PriceCell material={m} onSave={(p) => update(m, p)} />,
            },
            {
              key: 'note',
              label: t.materials.note,
              render: (m) => <NoteCell material={m} onSave={(p) => update(m, p)} />,
            },
            {
              key: 'active',
              label: t.materials.active,
              width: 80,
              align: 'center',
              render: (m) => (
                <Switch
                  checked={m.active}
                  onChange={(e) => update(m, { active: e.target.checked })}
                  slotProps={{ input: { 'aria-label': `${t.materials.active} – ${m.name}` } }}
                />
              ),
            },
          ]}
        />
      </Paper>

      <SettingsPanel onSaved={(message) => setToast({ severity: 'success', message })} />

      <AddMaterialDialog
        open={addOpen}
        materials={materials}
        onClose={() => setAddOpen(false)}
        onAdd={async (m) => {
          const created = await repo.addMaterial(m);
          setMaterials((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
          setToast({ severity: 'success', message: `${t.common.save}: ${created.name}` });
        }}
      />
      <ImportDialog
        open={importOpen}
        materials={materials}
        onClose={() => setImportOpen(false)}
        onImport={async (items) => {
          await repo.importMaterials(items);
          await reloadMaterials();
          setToast({ severity: 'success', message: fmt(t.materials.importDone, { n: items.length }) });
        }}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
