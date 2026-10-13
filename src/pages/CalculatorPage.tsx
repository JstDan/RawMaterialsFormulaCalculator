import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Snackbar, Stack } from '@mui/material';
import { ClientSection } from '../calculator/ClientSection';
import { FormulaSection } from '../calculator/FormulaSection';
import { MarkupSection } from '../calculator/MarkupSection';
import { OfferLinesSection } from '../calculator/OfferLinesSection';
import { ProductTypeSection } from '../calculator/ProductTypeSection';
import { QuantitySection, UnitsSection } from '../calculator/QuantitySections';
import { ResultsSection } from '../calculator/ResultsSection';
import type { SectionProps } from '../calculator/sectionProps';
import { useData } from '../data/DataContext';
import { calcInputFromForm, calculate } from '../lib/calc';
import { toOfferInput } from '../lib/offerRecord';
import { fieldId, firstError, validateOffer, type FieldKey } from '../lib/validation';
import { useOfferForm } from '../state/OfferFormContext';
import { fmt, t } from '../i18n';

type Toast = { severity: 'success' | 'error'; message: string } | null;

export function CalculatorPage() {
  const { form, setForm, loadForm, numberError, session } = useOfferForm();
  const { repo, materials, settings } = useData();
  const [touched, setTouched] = useState<Set<FieldKey>>(new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // A different offer was started/opened: forget which fields were touched.
  const [seenSession, setSeenSession] = useState(session);
  if (seenSession !== session) {
    setSeenSession(session);
    setTouched(new Set());
    setShowAllErrors(false);
  }

  const fixedCosts = form?.fixedCosts ?? settings.fixed_costs;
  const result = useMemo(() => (form ? calculate(calcInputFromForm(form, settings.fixed_costs)) : null), [form, settings]);
  const errors = useMemo(() => (form ? validateOffer(form) : {}), [form]);
  const valid = !firstError(errors);

  const touch = useCallback((key: FieldKey) => setTouched((s) => (s.has(key) ? s : new Set(s).add(key))), []);
  const errorFor = useCallback(
    (key: FieldKey) => (showAllErrors || touched.has(key) ? errors[key] : undefined),
    [errors, showAllErrors, touched],
  );

  const revealErrors = () => {
    setShowAllErrors(true);
    const first = firstError(errors);
    if (!first) return;
    const el = document.getElementById(fieldId(first));
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
  };

  const save = async () => {
    if (!form || !result || !valid) return revealErrors();
    setBusy(true);
    try {
      let current = form;
      if (!current.offer.offerNo.trim()) {
        const offerNo = await repo.nextOfferNo();
        current = { ...current, offer: { ...current.offer, offerNo } };
      }
      const saved = await repo.saveOffer(toOfferInput(current, result, settings.fixed_costs));
      loadForm({ ...saved.data, id: saved.id });
      setToast({ severity: 'success', message: fmt(t.results.savedOk, { no: saved.offer_no }) });
    } catch (e) {
      setToast({ severity: 'error', message: `${t.results.saveFailed}: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!form || !result || !valid) return revealErrors();
    setBusy(true);
    try {
      const { downloadOfferPdf } = await import('../lib/pdf');
      await downloadOfferPdf(form, result, settings);
    } catch (e) {
      setToast({ severity: 'error', message: `${t.results.pdfFailed}: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  if (!form || !result) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress aria-label={t.common.loading} />
      </Box>
    );
  }

  const sectionProps: SectionProps = { form, setForm, errorFor, touch };

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {numberError && <Alert severity="error">{`${t.common.error}: ${numberError}`}</Alert>}
      <ClientSection {...sectionProps} />
      <ProductTypeSection {...sectionProps} fixedCosts={fixedCosts} />
      <FormulaSection {...sectionProps} materials={materials} result={result} />
      <QuantitySection {...sectionProps} result={result} />
      <UnitsSection {...sectionProps} />
      <MarkupSection {...sectionProps} />
      <OfferLinesSection {...sectionProps} presets={settings.service_presets} />
      <ResultsSection
        form={form}
        result={result}
        valid={valid}
        busy={busy}
        onSave={save}
        onDownloadPdf={downloadPdf}
        onInvalidAttempt={revealErrors}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
