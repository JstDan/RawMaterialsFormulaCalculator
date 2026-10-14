import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControlLabel,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { useData } from '../data/DataContext';
import { SettingsPanel } from '../materials/SettingsPanel';
import { SyncCard } from '../materials/SyncCard';
import { formatEur } from '../lib/numbers';
import { matchesQuery } from '../lib/search';
import type { RawMaterial } from '../lib/types';
import { fmt, t } from '../i18n';

type Toast = { severity: 'success' | 'error'; message: string } | null;

/** The regulatory note is the only raw-material field editable in the app; it saves on blur. */
function NoteCell({ material, onSave }: { material: RawMaterial; onSave: (note: string | null) => void }) {
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
      onBlur={() => value.trim() !== current && onSave(value.trim() || null)}
      multiline
      maxRows={4}
      placeholder="–"
      sx={value ? (theme) => ({ '& textarea': { color: theme.palette.mode === 'dark' ? '#f5c46b' : '#8a5a00' } }) : undefined}
      slotProps={{ htmlInput: { 'aria-label': `${t.materials.note} – ${material.name}` } }}
    />
  );
}

export function RawMaterialsPage() {
  const { repo, materials, setMaterials } = useData();
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const filtered = useMemo(
    () => materials.filter((m) => (showInactive || m.active) && matchesQuery(m.name, query)),
    [materials, showInactive, query],
  );

  const saveNote = async (m: RawMaterial, note: string | null) => {
    try {
      const updated = await repo.updateRegulatoryNote(m.id, note);
      setMaterials((list) => list.map((x) => (x.id === m.id ? updated : x)));
      setToast({ severity: 'success', message: `${t.common.save}: ${m.name}` });
    } catch (e) {
      setToast({ severity: 'error', message: (e as Error).message });
    }
  };

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      <Box>
        <Typography variant="h1">{t.materials.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {fmt(t.materials.count, { n: materials.filter((m) => m.active).length })}
        </Typography>
      </Box>

      <SyncCard onSynced={(message, ok) => setToast({ severity: ok ? 'success' : 'error', message })} />

      <Alert severity="info">{t.materials.managedInSheet}</Alert>

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
              width: 130,
              align: 'right',
              render: (m) => formatEur(m.price_eur_per_kg),
            },
            {
              key: 'note',
              label: t.materials.note,
              render: (m) => <NoteCell material={m} onSave={(note) => saveNote(m, note)} />,
            },
            {
              key: 'status',
              label: t.materials.status,
              width: 120,
              align: 'center',
              render: (m) =>
                m.active ? (
                  <Chip size="small" color="success" variant="outlined" label={t.materials.statusActive} />
                ) : (
                  <Chip size="small" variant="outlined" label={t.materials.statusRemoved} />
                ),
            },
          ]}
        />
      </Paper>

      <SettingsPanel onSaved={(message) => setToast({ severity: 'success', message })} />

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
