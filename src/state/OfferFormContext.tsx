import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useData } from '../data/DataContext';
import { DEFAULT_COUNTRY } from '../lib/countries';
import { isoDate } from '../lib/numbers';
import { readStorage, removeStorage, writeStorage } from '../lib/storage';
import type { OfferForm, Settings } from '../lib/types';

const DRAFT_KEY = 'nk.draft';

/** Earlier default payment terms – unsaved drafts that still carry one get the current default. */
const OLD_DEFAULT_TERMS = [
  '100% advance payment',
  '50% Down Payment and 50% Balance Payment when goods are ready to be shipped',
];

export function createEmptyForm(settings: Settings, offerNo: string): OfferForm {
  return {
    id: null,
    receiver: { fullName: '', address: '', city: '', zip: '', country: DEFAULT_COUNTRY, phone: '', email: '' },
    invoice: { companyName: '', identificationNo: '', registrationAddress: '', vatNumber: '' },
    offer: { offerNo, offerDate: isoDate(0), validUntil: isoDate(30), productName: '' },
    productType: null,
    rows: [],
    capsulesPerDose: '1',
    capsuleSize: 'size0',
    maxFillMg: '500',
    quantityPerUnit: '',
    numberOfUnits: '',
    markup: String(settings.default_markup),
    addVat: false,
    vatRate: String(settings.default_vat_rate),
    discount: '0',
    extraItems: [],
    priceTiers: [],
    paymentTerms: settings.default_payment_terms,
    includeComposition: true,
    notes: '',
    fixedCosts: null,
  };
}

/** Fill fields added after a draft/offer was saved, so older offers keep working. */
export function normalizeForm(f: OfferForm, settings: Settings): OfferForm {
  const empty = createEmptyForm(settings, f.offer?.offerNo ?? '');
  return {
    ...empty,
    ...f,
    receiver: { ...empty.receiver, ...f.receiver },
    invoice: { ...empty.invoice, ...f.invoice },
    offer: { ...empty.offer, ...f.offer },
    extraItems: f.extraItems ?? [],
    priceTiers: f.priceTiers ?? [],
    discount: f.discount ?? '0',
    paymentTerms:
      f.paymentTerms == null || (!f.id && OLD_DEFAULT_TERMS.includes(f.paymentTerms))
        ? settings.default_payment_terms
        : f.paymentTerms,
  };
}

/** Copy of a saved offer as a new, unsaved offer with a fresh number and dates. */
export function duplicateForm(form: OfferForm, offerNo: string): OfferForm {
  return {
    ...structuredClone(form),
    id: null,
    fixedCosts: null,
    offer: { ...form.offer, offerNo, offerDate: isoDate(0), validUntil: isoDate(30) },
  };
}

export function defaultUnitFor(form: Pick<OfferForm, 'productType'>) {
  return form.productType === 'powder' ? 'g' : 'mg';
}

interface OfferFormState {
  form: OfferForm | null;
  /** Error from reserving a new offer number, if any. */
  numberError: string | null;
  setForm(updater: (f: OfferForm) => OfferForm): void;
  newOffer(): Promise<void>;
  /** Replace the form. `fresh` marks a different offer (resets validation state). */
  loadForm(form: OfferForm, fresh?: boolean): void;
  /** Increments whenever a different offer is started or opened. */
  session: number;
}

const Ctx = createContext<OfferFormState | null>(null);

export function OfferFormProvider({ children }: { children: ReactNode }) {
  const { repo, settings } = useData();
  const [form, setFormState] = useState<OfferForm | null>(() => {
    const draft = readStorage<OfferForm>(DRAFT_KEY);
    return draft ? normalizeForm(draft, settings) : null;
  });
  const [numberError, setNumberError] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const started = useRef(false);

  const newOffer = useCallback(async () => {
    removeStorage(DRAFT_KEY);
    setNumberError(null);
    let offerNo = '';
    try {
      offerNo = await repo.nextOfferNo();
    } catch (e) {
      setNumberError((e as Error).message);
    }
    setFormState(createEmptyForm(settings, offerNo));
    setSession((s) => s + 1);
  }, [repo, settings]);

  // First visit without a stored draft: start a fresh offer (guarded against StrictMode double effects).
  useEffect(() => {
    if (form || started.current) return;
    started.current = true;
    void newOffer();
  }, [form, newOffer]);

  // Persist the unsaved form so a page refresh doesn't lose work.
  useEffect(() => {
    if (form) writeStorage(DRAFT_KEY, form);
  }, [form]);

  const setForm = useCallback((updater: (f: OfferForm) => OfferForm) => {
    setFormState((f) => (f ? updater(f) : f));
  }, []);

  const loadForm = useCallback(
    (f: OfferForm, fresh = false) => {
      if (fresh) setSession((s) => s + 1);
      setNumberError(null);
      setFormState(normalizeForm(f, settings));
    },
    [settings],
  );

  const value = useMemo(
    () => ({ form, numberError, setForm, newOffer, loadForm, session }),
    [form, numberError, setForm, newOffer, loadForm, session],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOfferForm(): OfferFormState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOfferForm must be used inside OfferFormProvider');
  return ctx;
}

