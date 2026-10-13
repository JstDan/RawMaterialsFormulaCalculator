import type { OfferInput, OfferRecord, RawMaterial, Settings, SyncRun } from '../lib/types';

/** Storage backend used by the app – Supabase in production, localStorage in demo mode. */
export interface DataRepo {
  mode: 'supabase' | 'local';
  listMaterials(): Promise<RawMaterial[]>;
  /**
   * Raw materials are managed in the Google Sheet only (names, prices, active status via sync).
   * The regulatory note is the one field that can be edited in the app.
   */
  updateRegulatoryNote(id: string, note: string | null): Promise<RawMaterial>;
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
