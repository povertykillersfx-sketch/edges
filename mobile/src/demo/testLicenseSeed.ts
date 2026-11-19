import type { LicenseKey, ManagedEa } from '../AppState';

/** Known phone-test EA + keys (portal License Keys ↔ Activate share storage). */
export const TEST_LICENSE_KEY = 'EDGES-0X8V-0RUC-05GP-0KA1';
/** User-reported portal-issued key — kept so Activate finds it on this build. */
export const USER_PORTAL_LICENSE_KEY = 'EDGES-05IE-0ULX-0GDY-0X3U';
export const TEST_EA_NAME = 'Aurora Pulse XAU';
export const TEST_EA_ID = 'ea_aurora_pulse_xau';

const auroraAsset = require('../../assets/ea-aurora-pulse.jpg') as
  | number
  | { uri?: string }
  | string;

export function auroraPictureUri(): string {
  if (typeof auroraAsset === 'string') return auroraAsset;
  if (auroraAsset && typeof auroraAsset === 'object' && auroraAsset.uri) {
    return auroraAsset.uri;
  }
  // Metro numeric asset — Image can use require(); for uri string fallback use data-less path
  return String(auroraAsset);
}

export function seedTestEa(): ManagedEa {
  return {
    id: TEST_EA_ID,
    name: TEST_EA_NAME,
    pictureUri: auroraPictureUri(),
    symbols: ['XAUUSD', 'EURUSD'],
    createdAt: '2026-11-19T13:22:00.000Z',
  };
}

export function seedTestLicenseKeys(): LicenseKey[] {
  const ea = seedTestEa();
  const base = {
    eaId: ea.id,
    eaName: ea.name,
    eaPictureUri: ea.pictureUri,
    eaSymbols: [...ea.symbols],
  };
  return [
    {
      ...base,
      id: 'lic_aurora_pulse_xau',
      key: TEST_LICENSE_KEY,
      createdAt: '2026-11-19T13:22:58.000Z',
    },
    {
      ...base,
      id: 'lic_aurora_user_05ie',
      key: USER_PORTAL_LICENSE_KEY,
      createdAt: '2026-11-19T13:54:00.000Z',
    },
  ];
}

/** Merge demo EA + keys so portal-issued keys activate on the same device storage. */
export function mergeTestLicenseCatalog(
  eas: ManagedEa[],
  keys: LicenseKey[],
): { eas: ManagedEa[]; keys: LicenseKey[] } {
  const ea = seedTestEa();
  const seeds = seedTestLicenseKeys();
  const nextEas = eas.some((e) => e.id === ea.id || e.name === ea.name)
    ? eas.map((e) => (e.id === ea.id || e.name === ea.name ? { ...e, ...ea } : e))
    : [ea, ...eas];
  const nextKeys = [...keys];
  for (const lic of seeds) {
    if (!nextKeys.some((k) => k.key === lic.key)) nextKeys.unshift(lic);
  }
  return { eas: nextEas, keys: nextKeys };
}
