import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MentorSession } from './auth/mentorAuth';
import {
  EAS_STORAGE_KEY,
  LICENSE_KEYS_STORAGE_KEY,
  findIssuedLicense,
  loadLicenseCatalog,
  normalizeLicenseKey,
  saveLicenseCatalog,
  sessionFromLicenseKey,
} from './licenseStorage';

const EA_ACCESS_KEY = 'edges-ea-access-v1';
const ACTIVE_EA_KEY = 'edges-active-ea-v1';

export type EaAccess = {
  email: string;
  name: string;
  unlockedAt: string;
  product: 'Lumo Edge Pro';
  priceUsd: 35;
};

export type BotStatus = 'running' | 'stopped' | 'removed';

export type ManagedEa = {
  id: string;
  name: string;
  /** Local image URI / data URL */
  pictureUri: string | null;
  symbols: string[];
  createdAt: string;
};

/** Issued key mapped to an EA (snapshot + live eaId). */
export type LicenseKey = {
  id: string;
  eaId: string;
  eaName: string;
  key: string;
  createdAt: string;
  /** Snapshot used when the user activates on the app */
  eaPictureUri: string | null;
  eaSymbols: string[];
};

/** Activated robot session on the EA control UI (requires a real license key). */
export type ActiveEaSession = {
  licenseKey: string;
  eaId: string;
  name: string;
  pictureUri: string | null;
  symbols: string[];
  activatedAt: string;
};

export const SYMBOLS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'USDCHF',
  'AUDUSD',
  'USDCAD',
  'NZDUSD',
  'EURGBP',
  'EURJPY',
  'GBPJPY',
  'XAUUSD',
  'XAGUSD',
  'BTCUSD',
  'ETHUSD',
  'NAS100',
  'US30',
  'SPX500',
  'UK100',
  'GER40',
  'USOIL',
] as const;

export const ACCENTS = [
  { id: 'ferrari', value: '#FF0000', label: 'ferrari red' },
  { id: 'amber', value: '#FFB020', label: 'amber' },
  { id: 'cyan', value: '#3EE0FF', label: 'cyan' },
  { id: 'lime', value: '#C8F54A', label: 'lime' },
  { id: 'violet', value: '#C084FC', label: 'violet' },
  { id: 'rose', value: '#FF7A90', label: 'rose' },
] as const;

type AppStateValue = {
  status: BotStatus;
  setStatus: (s: BotStatus) => void;
  selected: string[];
  setSelected: (s: string[]) => void;
  accent: string;
  setAccent: (c: string) => void;
  mentor: MentorSession | null;
  setMentor: (m: MentorSession | null) => void;
  eas: ManagedEa[];
  addEa: (ea: Omit<ManagedEa, 'id' | 'createdAt'>) => ManagedEa;
  licenseKeys: LicenseKey[];
  generateLicenseKey: (eaId: string) => LicenseKey | null;
  eaAccess: EaAccess | null;
  accessReady: boolean;
  /** Paid access only — does NOT open control UI without a license. */
  unlockEaAccess: (input: { email: string; name: string }) => Promise<EaAccess>;
  activeEa: ActiveEaSession | null;
  activateLicenseKey: (rawKey: string) => Promise<
    | { ok: true; session: ActiveEaSession }
    | { ok: false; error: string }
  >;
  clearActiveEa: () => Promise<void>;
  refreshLicenseCatalog: () => Promise<void>;
};

const Ctx = createContext<AppStateValue | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function makeLicenseKey() {
  const block = () => {
    let s = '';
    while (s.length < 4) {
      s += Math.random()
        .toString(36)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    }
    return s.slice(0, 4);
  };
  return `EDGES-${block()}-${block()}-${block()}-${block()}`;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BotStatus>('running');
  const [selected, setSelected] = useState<string[]>([]);
  const [accent, setAccent] = useState('#FF0000');
  const [mentor, setMentor] = useState<MentorSession | null>(null);
  const [eas, setEas] = useState<ManagedEa[]>([]);
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([]);
  const [eaAccess, setEaAccess] = useState<EaAccess | null>(null);
  const [activeEa, setActiveEa] = useState<ActiveEaSession | null>(null);
  const [accessReady, setAccessReady] = useState(false);

  const easRef = useRef(eas);
  const keysRef = useRef(licenseKeys);
  easRef.current = eas;
  keysRef.current = licenseKeys;

  const applyCatalog = (nextEas: ManagedEa[], nextKeys: LicenseKey[]) => {
    setEas(nextEas);
    setLicenseKeys(nextKeys);
    easRef.current = nextEas;
    keysRef.current = nextKeys;
  };

  const refreshLicenseCatalog = useCallback(async () => {
    const catalog = await loadLicenseCatalog();
    applyCatalog(catalog.eas, catalog.keys);
    await saveLicenseCatalog(catalog.eas, catalog.keys);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [accessRaw, activeRaw] = await Promise.all([
          AsyncStorage.getItem(EA_ACCESS_KEY),
          AsyncStorage.getItem(ACTIVE_EA_KEY),
        ]);
        const catalog = await loadLicenseCatalog();
        if (cancelled) return;
        if (accessRaw) {
          const parsed = JSON.parse(accessRaw) as EaAccess;
          if (parsed?.email && parsed?.name) setEaAccess(parsed);
        }
        applyCatalog(catalog.eas, catalog.keys);
        await saveLicenseCatalog(catalog.eas, catalog.keys);
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw) as ActiveEaSession;
          if (parsed?.licenseKey && parsed?.name) {
            setActiveEa(parsed);
            setSelected(parsed.symbols ?? []);
          }
        }
      } catch {
        /* ignore corrupt storage */
      } finally {
        if (!cancelled) setAccessReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep portal + activate in sync across same-origin tabs / route focus (web).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (ev: StorageEvent) => {
      if (
        ev.key === LICENSE_KEYS_STORAGE_KEY ||
        ev.key === EAS_STORAGE_KEY ||
        ev.key === null
      ) {
        void refreshLicenseCatalog();
      }
    };
    const onFocus = () => {
      void refreshLicenseCatalog();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const unlockEaAccess: AppStateValue['unlockEaAccess'] = async ({
    email,
    name,
  }) => {
    const record: EaAccess = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      unlockedAt: new Date().toISOString(),
      product: 'Lumo Edge Pro',
      priceUsd: 35,
    };
    await AsyncStorage.setItem(EA_ACCESS_KEY, JSON.stringify(record));
    setEaAccess(record);
    return record;
  };

  const addEa: AppStateValue['addEa'] = (input) => {
    const ea: ManagedEa = {
      ...input,
      id: uid('ea'),
      createdAt: new Date().toISOString(),
    };
    const nextEas = [ea, ...easRef.current];
    applyCatalog(nextEas, keysRef.current);
    void saveLicenseCatalog(nextEas, keysRef.current);
    return ea;
  };

  const generateLicenseKey: AppStateValue['generateLicenseKey'] = (eaId) => {
    const ea = easRef.current.find((e) => e.id === eaId);
    if (!ea) return null;
    const row: LicenseKey = {
      id: uid('lic'),
      eaId: ea.id,
      eaName: ea.name,
      key: makeLicenseKey(),
      createdAt: new Date().toISOString(),
      eaPictureUri: ea.pictureUri,
      eaSymbols: [...ea.symbols],
    };
    const nextKeys = [row, ...keysRef.current];
    applyCatalog(easRef.current, nextKeys);
    void saveLicenseCatalog(easRef.current, nextKeys);
    return row;
  };

  const activateLicenseKey: AppStateValue['activateLicenseKey'] = async (
    rawKey,
  ) => {
    const key = normalizeLicenseKey(rawKey);
    if (!key.startsWith('EDGES-') || key.length < 20) {
      return { ok: false, error: 'Enter a valid EDGES-XXXX-XXXX-XXXX-XXXX key' };
    }

    // Always read shared AsyncStorage (same key portal writes) — not stale React state.
    let found = await findIssuedLicense(key);
    if (!found) {
      await refreshLicenseCatalog();
      found = await findIssuedLicense(key);
    }
    if (!found) {
      return {
        ok: false,
        error:
          'License key not found. Ask your mentor to generate one for your EA.',
      };
    }

    applyCatalog(found.eas, found.keys);
    // Strict key → EA mapping (snapshot on the license; no Aurora fallback).
    const session = sessionFromLicenseKey(found.key, found.eas);
    await AsyncStorage.setItem(ACTIVE_EA_KEY, JSON.stringify(session));
    setActiveEa(session);
    setSelected(session.symbols);
    setStatus('running');
    return { ok: true, session };
  };

  const clearActiveEa = async () => {
    await AsyncStorage.removeItem(ACTIVE_EA_KEY);
    setActiveEa(null);
    setSelected([]);
    setStatus('stopped');
  };

  const value = useMemo(
    () => ({
      status,
      setStatus,
      selected,
      setSelected,
      accent,
      setAccent,
      mentor,
      setMentor,
      eas,
      addEa,
      licenseKeys,
      generateLicenseKey,
      eaAccess,
      accessReady,
      unlockEaAccess,
      activeEa,
      activateLicenseKey,
      clearActiveEa,
      refreshLicenseCatalog,
    }),
    [
      status,
      selected,
      accent,
      mentor,
      eas,
      licenseKeys,
      eaAccess,
      accessReady,
      activeEa,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside provider');
  return v;
}
