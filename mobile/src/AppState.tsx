import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MentorSession } from './auth/mentorAuth';

export type BotStatus = 'running' | 'stopped' | 'removed';

export type ManagedEa = {
  id: string;
  name: string;
  /** Local image URI or bundled asset key */
  pictureUri: string | null;
  symbols: string[];
  createdAt: string;
};

export type LicenseKey = {
  id: string;
  eaId: string;
  eaName: string;
  key: string;
  createdAt: string;
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

/** Preset robot pictures mentors can pick (Edges-branded). */
export const EA_PICTURES = [
  { id: 'mascot', label: 'Edges mascot', uri: 'mascot' },
  { id: 'red', label: 'Ferrari red frame', uri: 'mascot' },
  { id: 'glass', label: 'Glass armor', uri: 'mascot' },
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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BotStatus>('running');
  const [selected, setSelected] = useState<string[]>(['EURUSD', 'XAUUSD']);
  const [accent, setAccent] = useState('#FF0000');
  const [mentor, setMentor] = useState<MentorSession | null>(null);
  const [eas, setEas] = useState<ManagedEa[]>([]);
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([]);

  const addEa: AppStateValue['addEa'] = (input) => {
    const ea: ManagedEa = {
      ...input,
      id: uid('ea'),
      createdAt: new Date().toISOString(),
    };
    setEas((prev) => [ea, ...prev]);
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
    };
    setLicenseKeys((prev) => [row, ...prev]);
    return row;
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
    }),
    [status, selected, accent, mentor, eas, licenseKeys],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside provider');
  return v;
}
