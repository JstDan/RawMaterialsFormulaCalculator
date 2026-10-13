import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { DEFAULT_SETTINGS, type RawMaterial, type Settings, type SyncRun } from '../lib/types';
import type { DataRepo } from './repo';
import { supabase } from './supabaseClient';
import { createSupabaseRepo } from './supabaseRepo';

/**
 * Supabase when its keys are present at build time; otherwise the local demo backend. The check uses the
 * build-time env values, so production builds with Supabase never include the demo data (price list).
 */
async function loadRepo(): Promise<DataRepo> {
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) return createSupabaseRepo(supabase!);
  const { createLocalRepo } = await import('./localRepo');
  return createLocalRepo();
}

const repo: DataRepo = await loadRepo();

/** Price list is pulled from the Google Sheet at least this often (in addition to the daily server job). */
export const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;

interface DataState {
  repo: DataRepo;
  materials: RawMaterial[];
  settings: Settings;
  loading: boolean;
  error: string | null;
  reloadMaterials(): Promise<void>;
  setMaterials: Dispatch<SetStateAction<RawMaterial[]>>;
  saveSettings(s: Settings): Promise<void>;
  lastSync: SyncRun | null;
  syncing: boolean;
  /** Pull the price list from the Google Sheet now and reload the materials. */
  syncNow(source?: 'manual' | 'auto'): Promise<SyncRun>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncRun | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncInFlight = useRef<Promise<SyncRun> | null>(null);

  const reloadMaterials = useCallback(async () => {
    setMaterials(await repo.listMaterials());
  }, []);

  const syncNow = useCallback(
    (source: 'manual' | 'auto' = 'manual') => {
      syncInFlight.current ??= (async () => {
        setSyncing(true);
        try {
          const run = await repo.syncFromSheet(source);
          setLastSync(run);
          if (run.status === 'success') await reloadMaterials();
          return run;
        } finally {
          setSyncing(false);
          syncInFlight.current = null;
        }
      })();
      return syncInFlight.current;
    },
    [reloadMaterials],
  );

  useEffect(() => {
    Promise.all([repo.listMaterials(), repo.getSettings()])
      .then(([m, s]) => {
        setMaterials(m);
        setSettings(s);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // 24h fallback: sync when the last run (manual, scheduled or auto) is older than a day.
  // Checked on open and hourly while the app stays open.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const last = await repo.lastSyncRun();
        if (cancelled) return;
        setLastSync(last);
        const age = last ? Date.now() - new Date(last.created_at).getTime() : Infinity;
        // Failed runs are retried hourly, successful ones daily.
        if (age > (last?.status === 'error' ? CHECK_EVERY_MS : SYNC_INTERVAL_MS)) await syncNow('auto');
      } catch {
        // Sync status is informational; never block the calculator.
      }
    };
    void check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [syncNow]);

  const value = useMemo<DataState>(
    () => ({
      repo,
      materials,
      settings,
      loading,
      error,
      reloadMaterials,
      setMaterials,
      async saveSettings(s) {
        setSettings(await repo.saveSettings(s));
      },
      lastSync,
      syncing,
      syncNow,
    }),
    [materials, settings, loading, error, reloadMaterials, lastSync, syncing, syncNow],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
