import { DEFAULT_SETTINGS, type OfferRecord, type RawMaterial, type Settings, type SyncRun } from '../lib/types';
import { buildImportPreview, buildSyncPlan, extractSheetId, sheetExportPath } from '../lib/materialImport';
import { readStorage, writeStorage } from '../lib/storage';
import { formatOfferNo, type DataRepo } from './repo';
import seed from './seedMaterials.json';

// Demo backend used when Supabase is not configured. Everything lives in this browser's localStorage.
const KEYS = {
  materials: 'nk.local.materials',
  settings: 'nk.local.settings',
  offers: 'nk.local.offers',
  counters: 'nk.local.offerCounters',
  lastSync: 'nk.local.lastSync',
};

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function loadMaterials(): RawMaterial[] {
  const stored = readStorage<RawMaterial[]>(KEYS.materials);
  if (stored) return stored;
  const seeded = (seed as Pick<RawMaterial, 'name' | 'price_eur_per_kg' | 'regulatory_note'>[]).map((m) => ({
    ...m,
    id: uid(),
    active: true,
    updated_at: now(),
  }));
  writeStorage(KEYS.materials, seeded);
  return seeded;
}

const sortByName = (list: RawMaterial[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

export function createLocalRepo(): DataRepo {
  const repo: DataRepo = {
    mode: 'local',

    async listMaterials() {
      return sortByName(loadMaterials());
    },

    async addMaterial(m) {
      const list = loadMaterials();
      if (list.some((x) => x.name.toLowerCase() === m.name.toLowerCase())) {
        throw new Error('duplicate key value violates unique constraint "raw_materials_name_key"');
      }
      const created: RawMaterial = { ...m, id: uid(), active: true, updated_at: now() };
      writeStorage(KEYS.materials, [...list, created]);
      return created;
    },

    async updateMaterial(id, patch) {
      const list = loadMaterials();
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) throw new Error('Material not found');
      list[idx] = { ...list[idx], ...patch, updated_at: now() };
      writeStorage(KEYS.materials, list);
      return list[idx];
    },

    async importMaterials(items) {
      const list = loadMaterials();
      const byName = new Map(list.map((m) => [m.name, m]));
      for (const item of items) {
        const existing = byName.get(item.name);
        if (existing) {
          existing.price_eur_per_kg = item.price_eur_per_kg;
          existing.updated_at = now();
        } else {
          const created: RawMaterial = { ...item, regulatory_note: null, id: uid(), active: true, updated_at: now() };
          list.push(created);
          byName.set(created.name, created);
        }
      }
      writeStorage(KEYS.materials, list);
    },

    async getSettings() {
      const stored = readStorage<Settings>(KEYS.settings);
      return { ...DEFAULT_SETTINGS, ...stored, fixed_costs: { ...DEFAULT_SETTINGS.fixed_costs, ...stored?.fixed_costs } };
    },

    async saveSettings(s) {
      writeStorage(KEYS.settings, s);
      return s;
    },

    async nextOfferNo() {
      const year = new Date().getFullYear();
      const counters = readStorage<Record<string, number>>(KEYS.counters) ?? {};
      const n = (counters[year] ?? 0) + 1;
      writeStorage(KEYS.counters, { ...counters, [year]: n });
      return formatOfferNo(year, n);
    },

    async listOffers() {
      const offers = readStorage<OfferRecord[]>(KEYS.offers) ?? [];
      return [...offers].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async getOffer(id) {
      return (readStorage<OfferRecord[]>(KEYS.offers) ?? []).find((o) => o.id === id) ?? null;
    },

    async saveOffer(offer) {
      const offers = readStorage<OfferRecord[]>(KEYS.offers) ?? [];
      if (offers.some((o) => o.offer_no === offer.offer_no && o.id !== offer.id)) {
        throw new Error(`Offer number ${offer.offer_no} already exists`);
      }
      const idx = offer.id ? offers.findIndex((o) => o.id === offer.id) : -1;
      const record: OfferRecord =
        idx >= 0
          ? { ...offers[idx], ...offer, id: offers[idx].id, updated_at: now() }
          : { ...offer, id: uid(), created_by: 'local', created_at: now(), updated_at: now() };
      if (idx >= 0) offers[idx] = record;
      else offers.push(record);
      if (!writeStorage(KEYS.offers, offers)) throw new Error('Browser storage is full or unavailable');
      return record;
    },

    async deleteOffer(id) {
      const offers = readStorage<OfferRecord[]>(KEYS.offers) ?? [];
      writeStorage(
        KEYS.offers,
        offers.filter((o) => o.id !== id),
      );
    },

    async syncFromSheet(source) {
      // Demo mode only: Google sends no CORS headers, so the download goes through the Vite dev proxy (/gsheet).
      const record = (run: Omit<SyncRun, 'id' | 'created_at' | 'source'>): SyncRun => {
        const full: SyncRun = { id: uid(), created_at: now(), source, ...run };
        writeStorage(KEYS.lastSync, full);
        return full;
      };
      const empty = { added: 0, changed: 0, unchanged: 0, invalid: 0, missing: 0, removed: 0, restored: 0 };
      try {
        const fileId = extractSheetId((await repo.getSettings()).google_sheet_url);
        if (!fileId) throw new Error('Google Sheet link in Settings is missing or invalid');
        const res = await fetch(`/gsheet${sheetExportPath(fileId)}`);
        if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) {
          throw new Error(`Could not download the sheet (HTTP ${res.status}). In demo mode sync only works with "npm run dev".`);
        }
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await res.arrayBuffer());
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: null });
        const current = loadMaterials();
        const preview = buildImportPreview(rows, current);
        if (!preview) throw new Error('Columns "Raw Material" and "Price DDP/EUR/kg" were not found in the first sheet');
        const plan = buildSyncPlan(preview, current);
        await repo.importMaterials(plan.upserts);
        // Sheet decides what is active: removed rows are hidden, returning rows shown again.
        const activeByName = new Map([
          ...plan.upserts.map((u) => [u.name, true] as const),
          ...plan.deactivate.map((name) => [name, false] as const),
        ]);
        writeStorage(
          KEYS.materials,
          loadMaterials().map((m) =>
            activeByName.has(m.name) && activeByName.get(m.name) !== m.active
              ? { ...m, active: activeByName.get(m.name)!, updated_at: now() }
              : m,
          ),
        );
        return record({
          removed: plan.deactivate.length,
          restored: plan.reactivate.length,
          status: 'success',
          error: null,
          added: preview.added.length,
          changed: preview.changed.length,
          unchanged: preview.unchanged.length,
          invalid: preview.invalid.length,
          missing: preview.missing.length,
        });
      } catch (e) {
        return record({ status: 'error', error: (e as Error).message, ...empty });
      }
    },

    async lastSyncRun() {
      return readStorage<SyncRun>(KEYS.lastSync);
    },
  };
  return repo;
}
