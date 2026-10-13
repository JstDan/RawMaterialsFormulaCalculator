export type ProductType = 'capsules_glass' | 'capsules_plastic' | 'powder';
export const PRODUCT_TYPES: ProductType[] = ['capsules_glass', 'capsules_plastic', 'powder'];

export type DoseUnit = 'mcg' | 'mg' | 'g';
export const DOSE_UNITS: DoseUnit[] = ['mcg', 'mg', 'g'];

export type CapsuleSize = 'size1' | 'size0' | 'size00';
export const CAPSULE_SIZES: Record<CapsuleSize, number> = { size1: 400, size0: 500, size00: 730 };

export function isCapsule(type: ProductType | null | undefined): boolean {
  return type === 'capsules_glass' || type === 'capsules_plastic';
}

export interface RawMaterial {
  id: string;
  name: string;
  price_eur_per_kg: number;
  regulatory_note: string | null;
  active: boolean;
  updated_at: string;
}

export type FixedCosts = Record<ProductType, number>;

export interface Settings {
  fixed_costs: FixedCosts;
  default_markup: number;
  default_vat_rate: number;
  company_name: string;
  company_address: string;
  company_vat: string;
  company_email: string;
  company_phone: string;
  logo_data_url: string | null;
  terms_text: string;
  /** Google Sheet / Drive .xlsx share link the price list is synced from. */
  google_sheet_url: string;
}

export const DEFAULT_SETTINGS: Settings = {
  fixed_costs: { capsules_glass: 2.5, capsules_plastic: 2.2, powder: 2.7 },
  default_markup: 30,
  default_vat_rate: 20,
  company_name: 'Nutrikal',
  company_address: 'Bulgaria',
  company_vat: '',
  company_email: 'sales@nutrikal.com',
  company_phone: '',
  logo_data_url: null,
  google_sheet_url: 'https://docs.google.com/spreadsheets/d/1dfylFe0D-xWlQ1PXcVUAGtNrPNS4bGJK/edit?usp=sharing',
  terms_text:
    'Prices are in EUR excl. VAT. Lead time and MOQ to be confirmed upon order. Final label text subject to EU regulatory review.',
};

/** One ingredient line of the formula. Price and note are a snapshot taken when the row was added. */
export interface FormulaRow {
  key: string;
  materialId: string | null;
  name: string;
  pricePerKg: number;
  regulatoryNote: string | null;
  amount: string;
  unit: DoseUnit;
}

/** Everything the calculator form holds. Numeric inputs are kept as strings so "1,5" can be typed. */
export interface OfferForm {
  id: string | null;
  receiver: {
    fullName: string;
    address: string;
    city: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
  };
  invoice: {
    companyName: string;
    registrationAddress: string;
    vatNumber: string;
  };
  offer: {
    offerNo: string;
    offerDate: string;
    validUntil: string;
    productName: string;
  };
  productType: ProductType | null;
  rows: FormulaRow[];
  capsulesPerDose: string;
  capsuleSize: CapsuleSize;
  maxFillMg: string;
  quantityPerUnit: string;
  numberOfUnits: string;
  markup: string;
  addVat: boolean;
  vatRate: string;
  includeComposition: boolean;
  notes: string;
  /** Fixed costs snapshot; null means "use current settings" (unsaved offers). */
  fixedCosts: FixedCosts | null;
}

export interface OfferRecord {
  id: string;
  offer_no: string;
  receiver_name: string;
  receiver_email: string;
  company_name: string | null;
  product_name: string | null;
  product_type: ProductType | null;
  total_excl_vat: number;
  total_incl_vat: number;
  data: OfferForm;
  results: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OfferInput = Omit<OfferRecord, 'id' | 'created_by' | 'created_at' | 'updated_at'> & { id?: string | null };

/** One run of the Google Sheet price-list sync. */
export interface SyncRun {
  id: string;
  created_at: string;
  source: 'manual' | 'scheduled' | 'auto';
  status: 'success' | 'error';
  added: number;
  changed: number;
  unchanged: number;
  invalid: number;
  missing: number;
  error: string | null;
}
