import type { OfferInput, OfferRecord, RawMaterial, Settings, SyncRun } from '../lib/types';

export interface MaterialImportItem {
  name: string;
  price_eur_per_kg: number;
}

/** Storage backend used by the app – Supabase in production, localStorage in demo mode. */
export interface DataRepo {
  mode: 'supabase' | 'local';
  listMaterials(): Promise<RawMaterial[]>;
  addMaterial(m: Pick<RawMaterial, 'name' | 'price_eur_per_kg' | 'regulatory_note'>): Promise<RawMaterial>;
  updateMaterial(
    id: string,
    patch: Partial<Pick<RawMaterial, 'name' | 'price_eur_per_kg' | 'regulatory_note' | 'active'>>,
  ): Promise<RawMaterial>;
  /** Upsert by name: existing materials get the new price, unknown names are inserted. */
  importMaterials(items: MaterialImportItem[]): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<Settings>;
  /** Reserve the next sequential offer number (NK-YYYY-0001). */
  nextOfferNo(): Promise<string>;
  listOffers(): Promise<OfferRecord[]>;
  getOffer(id: string): Promise<OfferRecord | null>;
  saveOffer(offer: OfferInput): Promise<OfferRecord>;
  deleteOffer(id: string): Promise<void>;
  /** Pull names + prices from the Google Sheet in settings (one-way, sheet -> raw materials). */
  syncFromSheet(source: 'manual' | 'auto'): Promise<SyncRun>;
  lastSyncRun(): Promise<SyncRun | null>;
}

export function formatOfferNo(year: number, n: number): string {
  return `NK-${year}-${String(n).padStart(4, '0')}`;
}
