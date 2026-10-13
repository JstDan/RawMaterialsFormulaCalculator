import { useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import { buildImportPreview, previewToUpserts, type ImportPreview } from '../lib/materialImport';
import { formatEur } from '../lib/numbers';
import type { RawMaterial } from '../lib/types';
import { fmt, t } from '../i18n';

interface Props {
  open: boolean;
  materials: RawMaterial[];
  onClose: () => void;
  onImport: (items: { name: string; price_eur_per_kg: number }[]) => Promise<void>;
}

const MAX_LISTED = 200;

export function ImportDialog({ open, materials, onClose, onImport }: Props) {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFileName('');
    setPreview(null);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    reset();
    setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: null });
      const p = buildImportPreview(rows, materials);
      if (!p) setError(t.materials.importMissingColumns);
      else setPreview(p);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const changes = preview ? preview.added.length + preview.changed.length : 0;

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await onImport(previewToUpserts(preview));
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>{t.materials.importTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t.materials.importHint}
          </Typography>
          <Box>
            <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
              {t.materials.chooseFile}
              <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={pickFile} />
            </Button>
            {fileName && (
              <Typography variant="body2" component="span" sx={{ ml: 1.5, overflowWrap: 'anywhere' }}>
                {fileName}
              </Typography>
            )}
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          {preview && (
            <>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip color="success" label={`${t.materials.previewNew}: ${preview.added.length}`} />
                <Chip color="warning" label={`${t.materials.previewChanged}: ${preview.changed.length}`} />
                <Chip label={`${t.materials.previewUnchanged}: ${preview.unchanged.length}`} />
                {preview.invalid.length > 0 && (
                  <Chip color="error" variant="outlined" label={`${t.materials.previewInvalid}: ${preview.invalid.length}`} />
                )}
              </Stack>
              {changes === 0 && <Alert severity="info">{t.materials.nothingToImport}</Alert>}
              <List dense disablePadding>
                {preview.added.slice(0, MAX_LISTED).map((a) => (
                  <ListItem key={`n-${a.name}`} disableGutters>
                    <ListItemText
                      primary={a.name}
                      secondary={`${t.materials.previewNew} · ${formatEur(a.price)}/kg`}
                      slotProps={{ primary: { sx: { overflowWrap: 'anywhere' } } }}
                    />
                  </ListItem>
                ))}
                {preview.changed.slice(0, MAX_LISTED).map((c) => (
                  <ListItem key={`c-${c.name}`} disableGutters>
                    <ListItemText
                      primary={c.name}
                      secondary={`${formatEur(c.oldPrice)} → ${formatEur(c.newPrice)}/kg`}
                      slotProps={{ primary: { sx: { overflowWrap: 'anywhere' } } }}
                    />
                  </ListItem>
                ))}
                {preview.invalid.map((x) => (
                  <ListItem key={`i-${x.row}`} disableGutters>
                    <ListItemText
                      primary={`Row ${x.row}`}
                      secondary={x.reason}
                      slotProps={{ primary: { color: 'error' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t.common.cancel}</Button>
        <Button variant="contained" disabled={!changes || busy} onClick={confirm}>
          {fmt(t.materials.confirmImport, { n: changes })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
