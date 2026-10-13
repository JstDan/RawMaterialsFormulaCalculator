import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { NumberField } from '../components/NumberField';
import { parseNum } from '../lib/numbers';
import type { RawMaterial } from '../lib/types';
import { t } from '../i18n';

interface Props {
  open: boolean;
  materials: RawMaterial[];
  onClose: () => void;
  onAdd: (m: Pick<RawMaterial, 'name' | 'price_eur_per_kg' | 'regulatory_note'>) => Promise<void>;
}

export function AddMaterialDialog({ open, materials, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const exists = materials.some((m) => m.name.trim().toLowerCase() === trimmed.toLowerCase());
  const priceNum = parseNum(price);
  const priceInvalid = price !== '' && (priceNum === null || priceNum < 0);
  const canSave = !!trimmed && !exists && priceNum !== null && priceNum >= 0 && !busy;

  const close = () => {
    setName('');
    setPrice('');
    setNote('');
    setError(null);
    onClose();
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      await onAdd({ name: trimmed, price_eur_per_kg: priceNum, regulatory_note: note.trim() || null });
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{t.materials.addTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t.materials.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={exists}
            helperText={exists ? t.materials.nameExists : undefined}
            required
            autoFocus
          />
          <NumberField
            label={t.materials.price}
            value={price}
            onChange={setPrice}
            suffix="€/kg"
            error={priceInvalid}
            helperText={priceInvalid ? t.materials.invalidPrice : undefined}
            required
          />
          <TextField label={t.materials.note} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t.common.cancel}</Button>
        <Button variant="contained" onClick={save} disabled={!canSave}>
          {t.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
