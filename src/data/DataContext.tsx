import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { DEFAULT_SETTINGS, type RawMaterial, type Settings } from '../lib/types';
import type { DataRepo } from './repo';
import { supabase } from './supabaseClient';
import { createSupabaseRepo } from './supabaseRepo';
import { createLocalRepo } from './localRepo';

const repo: DataRepo = supabase ? createSupabaseRepo(supabase) : createLocalRepo();

interface DataState {
  repo: DataRepo;
  materials: RawMaterial[];
  settings: Settings;
  loading: boolean;
  error: string | null;
  reloadMaterials(): Promise<void>;
  setMaterials: Dispatch<SetStateAction<RawMaterial[]>>;
  saveSettings(s: Settings): Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadMaterials = useCallback(async () => {
    setMaterials(await repo.listMaterials());
  }, []);

  useEffect(() => {
    Promise.all([repo.listMaterials(), repo.getSettings()])
      .then(([m, s]) => {
        setMaterials(m);
        setSettings(s);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
    }),
    [materials, settings, loading, error, reloadMaterials],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
