import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import OpenIcon from '@mui/icons-material/EditOutlined';
import CopyIcon from '@mui/icons-material/ContentCopy';
import PdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { useData } from '../data/DataContext';
import { calcInputFromForm, calculate } from '../lib/calc';
import { formatDate, formatEur } from '../lib/numbers';
import { matchesQuery } from '../lib/search';
import type { OfferRecord } from '../lib/types';
import { duplicateForm, useOfferForm } from '../state/OfferFormContext';
import { fmt, t } from '../i18n';

export function SavedOffersPage() {
  const { repo, settings } = useData();
  const { form, setForm, loadForm } = useOfferForm();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<OfferRecord[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<OfferRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    repo
      .listOffers()
      .then(setOffers)
      .catch((e: Error) => setError(e.message));
  }, [repo]);

  const filtered = useMemo(
    () =>
      (offers ?? []).filter((o) =>
        matchesQuery(
          [o.offer_no, o.receiver_name, o.receiver_email, o.company_name, o.product_name].filter(Boolean).join(' '),
          query,
        ),
      ),
    [offers, query],
  );

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const open = (o: OfferRecord) => {
    loadForm({ ...o.data, id: o.id, offer: { ...o.data.offer, offerNo: o.offer_no } }, true);
    navigate('/');
    window.scrollTo({ top: 0 });
  };

  const duplicate = (o: OfferRecord) =>
    run(o.id, async () => {
      loadForm(duplicateForm(o.data, await repo.nextOfferNo()), true);
      navigate('/');
      window.scrollTo({ top: 0 });
    });

  const pdf = (o: OfferRecord) =>
    run(o.id, async () => {
      const { downloadOfferPdf } = await import('../lib/pdf');
      const data = { ...o.data, offer: { ...o.data.offer, offerNo: o.offer_no } };
      // Recalculate from the stored snapshot (prices + fixed costs at the time of saving).
      const result = calculate(calcInputFromForm(data, data.fixedCosts ?? settings.fixed_costs));
      await downloadOfferPdf(data, result, settings);
    });

  const confirmDelete = () => {
    const o = toDelete;
    if (!o) return;
    setToDelete(null);
    void run(o.id, async () => {
      await repo.deleteOffer(o.id);
      setOffers((list) => list?.filter((x) => x.id !== o.id) ?? null);
      // The open draft was this offer: keep the work, but saving now creates a new offer.
      if (form?.id === o.id) setForm((f) => ({ ...f, id: null, fixedCosts: null }));
    });
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="h1">{t.offers.title}</Typography>
      <TextField
        placeholder={t.offers.searchPlaceholder}
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
          htmlInput: { 'aria-label': t.offers.searchPlaceholder },
        }}
      />
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
        {offers === null && !error ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress aria-label={t.common.loading} />
          </Box>
        ) : (
          <ResponsiveTable<OfferRecord>
            rows={filtered}
            getKey={(o) => o.id}
            empty={offers?.length ? t.offers.noMatch : t.offers.empty}
            columns={[
              {
                key: 'no',
                label: t.offers.offerNo,
                primary: true,
                width: '17%',
                render: (o) => (
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {o.offer_no}
                  </Box>
                ),
              },
              { key: 'date', label: t.offers.date, width: '12%', render: (o) => formatDate(o.data.offer.offerDate || o.created_at) },
              {
                key: 'client',
                label: t.offers.client,
                render: (o) => (
                  <>
                    {o.receiver_name}
                    {o.company_name && (
                      <Typography variant="caption" color="text.secondary" component="div">
                        {o.company_name}
                      </Typography>
                    )}
                  </>
                ),
              },
              { key: 'product', label: t.offers.product, width: '20%', render: (o) => o.product_name || '–' },
              {
                key: 'total',
                label: t.offers.total,
                align: 'right',
                width: '14%',
                render: (o) => formatEur(o.total_incl_vat || o.total_excl_vat),
              },
              {
                key: 'actions',
                label: '',
                align: 'right',
                width: 168,
                render: (o) => (
                  <Stack direction="row" spacing={0} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Tooltip title={t.offers.open}>
                      <IconButton aria-label={`${t.offers.open} ${o.offer_no}`} onClick={() => open(o)} disabled={busyId === o.id}>
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t.offers.duplicate}>
                      <IconButton aria-label={`${t.offers.duplicate} ${o.offer_no}`} onClick={() => duplicate(o)} disabled={busyId === o.id}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t.offers.pdf}>
                      <IconButton aria-label={`${t.offers.pdf} ${o.offer_no}`} onClick={() => pdf(o)} disabled={busyId === o.id}>
                        <PdfIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t.offers.delete}>
                      <IconButton
                        aria-label={`${t.offers.delete} ${o.offer_no}`}
                        onClick={() => setToDelete(o)}
                        disabled={busyId === o.id}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ),
              },
            ]}
          />
        )}
      </Paper>

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>{t.offers.deleteTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{fmt(t.offers.deleteText, { no: toDelete?.offer_no ?? '' })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>{t.common.cancel}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            {t.common.delete}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={8000} onClose={() => setError(null)}>
        {error ? (
          <Alert severity="error" variant="filled" onClose={() => setError(null)}>
            {`${t.common.error}: ${error}`}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
