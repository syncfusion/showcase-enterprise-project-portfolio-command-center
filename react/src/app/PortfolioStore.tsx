// The tab's portfolio session: the validated baseline plus a private edit overlay.
// Customer persistence is browser localStorage (key eppcc-session, schema 1); public visitors
// get the same overlay in memory only (contracts/data-contract.md, "Public and customer behavior").
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DatasetResult } from '../adapters/dataset';
import type { PortfolioDataset, SessionState } from '../domain/types';
import { validateEdits } from '../domain/session';

const STORAGE_KEY = 'eppcc-session';
const SCHEMA_VERSION = 1;

export interface PersistedSession { schemaVersion: number; edits: SessionState }

function readStored(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return {}; // stale schema: discard, never migrate
    const errors = validateEdits(parsed.edits);
    return errors.length ? {} : parsed.edits;
  } catch { return {}; }
}

function writeStored(edits: SessionState): void {
  try {
    const payload: PersistedSession = { schemaVersion: SCHEMA_VERSION, edits };
    if (Object.keys(edits).length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* storage unavailable: session stays in memory */ }
}

export type ProfileMode = 'public' | 'customer';

interface Store {
  load: DatasetResult;
  dataset: PortfolioDataset | null;
  edits: SessionState;
  profile: ProfileMode;
  setProfile(mode: ProfileMode): void;
  editStage(projectId: string, value: import('../domain/types').Stage): void;
  reset(): void;
  editCount: number;
}

const Ctx = createContext<Store | null>(null);

export function PortfolioStoreProvider({ load, children }: { load: DatasetResult; children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileMode>(() => {
    try { return localStorage.getItem(`${STORAGE_KEY}-profile`) === 'customer' ? 'customer' : 'public'; } catch { return 'public'; }
  });
  const [edits, setEdits] = useState<SessionState>(() => (profile === 'customer' ? readStored() : {}));
  // "Remember my edits" (customer persistence): turning it on keeps this session's edits and saves
  // them in this browser; turning it off forgets the saved copy but keeps the edits until reload.
  const applyProfile = useCallback((mode: ProfileMode) => {
    setProfile(mode);
    setEdits((current) => {
      if (mode === 'customer') writeStored(current);
      else { try { localStorage.removeItem(STORAGE_KEY); } catch { /* optional */ } }
      return current;
    });
    try { localStorage.setItem(`${STORAGE_KEY}-profile`, mode); } catch { /* optional */ }
  }, []);

  const editStage = useCallback((projectId: string, value: import('../domain/types').Stage) => {
    setEdits((prev) => {
      const next = { ...prev, [projectId]: { field: 'stage' as const, projectId, value, at: new Date().toISOString() } };
      if (profile === 'customer') writeStored(next);
      return next;
    });
  }, [profile]);

  const reset = useCallback(() => {
    setEdits({});
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* optional */ }
  }, []);

  const value = useMemo<Store>(() => ({
    load, dataset: load.ok ? load.dataset : null, edits, profile, setProfile: applyProfile, editStage, reset,
    editCount: Object.keys(edits).length,
  }), [load, edits, profile, applyProfile, editStage, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortfolioStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('usePortfolioStore must be used inside PortfolioStoreProvider');
  return store;
}