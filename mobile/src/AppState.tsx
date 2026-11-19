import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MentorSession } from './auth/mentorAuth';
import { mergeTestLicenseCatalog } from './demo/testLicenseSeed';

const EA_ACCESS_KEY = 'edges-ea-access-v1';
const EAS_KEY = 'edges-managed-eas-v1';
const LICENSE_KEYS_KEY = 'edges-license-keys-v1';
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
};

const Ctx = createContext<AppStateValue | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function makeLicenseKey() {
  const block = () =>
    Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return `EDGES-${block()}-${block()}-${block()}-${block()}`;
}

function normalizeKey(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [accessRaw, easRaw, keysRaw, activeRaw] = await Promise.all([
          AsyncStorage.getItem(EA_ACCESS_KEY),
          AsyncStorage.getItem(EAS_KEY),
          AsyncStorage.getItem(LICENSE_KEYS_KEY),
          AsyncStorage.getItem(ACTIVE_EA_KEY),
        ]);
        if (cancelled) return;
        if (accessRaw) {
          const parsed = JSON.parse(accessRaw) as EaAccess;
          if (parsed?.email && parsed?.name) setEaAccess(parsed);
        }
        let loadedEas: ManagedEa[] = [];
        let loadedKeys: LicenseKey[] = [];
        if (easRaw) {
          const parsed = JSON.parse(easRaw) as ManagedEa[];
          if (Array.isArray(parsed)) loadedEas = parsed;
        }
        if (keysRaw) {
          const parsed = JSON.parse(keysRaw) as LicenseKey[];
          if (Array.isArray(parsed)) loadedKeys = parsed;
        }
        const seeded = mergeTestLicenseCatalog(loadedEas, loadedKeys);
        setEas(seeded.eas);
        setLicenseKeys(seeded.keys);
        // Persist seed so License Keys panel + activation share the same catalog
        await AsyncStorage.setItem(EAS_KEY, JSON.stringify(seeded.eas));
        await AsyncStorage.setItem(LICENSE_KEYS_KEY, JSON.stringify(seeded.keys));
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
    setEas((prev) => {
      const next = [ea, ...prev];
      void AsyncStorage.setItem(EAS_KEY, JSON.stringify(next));
      return next;
    });
    return ea;
  };

  const generateLicenseKey: AppStateValue['generateLicenseKey'] = (eaId) => {
    const ea = eas.find((e) => e.id === eaId);
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
    setLicenseKeys((prev) => {
      const next = [row, ...prev];
      void AsyncStorage.setItem(LICENSE_KEYS_KEY, JSON.stringify(next));
      return next;
    });
    return row;
  };

  const activateLicenseKey: AppStateValue['activateLicenseKey'] = async (
    rawKey,
  ) => {
    const key = normalizeKey(rawKey);
    if (!key.startsWith('EDGES-') || key.length < 20) {
      return { ok: false, error: 'Enter a valid EDGES-XXXX-XXXX-XXXX-XXXX key' };
    }
    const issued = licenseKeys.find((k) => normalizeKey(k.key) === key);
    if (!issued) {
      return {
        ok: false,
        error: 'License key not found. Ask your mentor to generate one for your EA.',
      };
    }
    const live = eas.find((e) => e.id === issued.eaId);
    const session: ActiveEaSession = {
      licenseKey: issued.key,
      eaId: issued.eaId,
      name: live?.name ?? issued.eaName,
      pictureUri: live?.pictureUri ?? issued.eaPictureUri,
      symbols: live?.symbols?.length ? [...live.symbols] : [...issued.eaSymbols],
      activatedAt: new Date().toISOString(),
    };
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
