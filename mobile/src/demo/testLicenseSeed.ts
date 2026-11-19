import type { LicenseKey, ManagedEa } from '../AppState';

/** Known phone-test EA + key (also issued via Mentors Portal → License Keys). */
export const TEST_LICENSE_KEY = 'EDGES-0X8V-0RUC-05GP-0KA1';
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

export function seedTestLicenseKey(): LicenseKey {
  const ea = seedTestEa();
  return {
    id: 'lic_aurora_pulse_xau',
    eaId: ea.id,
    eaName: ea.name,
    key: TEST_LICENSE_KEY,
    createdAt: '2026-11-19T13:22:58.000Z',
    eaPictureUri: ea.pictureUri,
    eaSymbols: [...ea.symbols],
  };
}

/** Merge demo EA + key so phone Safari can activate without local mentor session. */
export function mergeTestLicenseCatalog(
  eas: ManagedEa[],
  keys: LicenseKey[],
): { eas: ManagedEa[]; keys: LicenseKey[] } {
  const ea = seedTestEa();
  const lic = seedTestLicenseKey();
  const nextEas = eas.some((e) => e.id === ea.id || e.name === ea.name)
    ? eas.map((e) => (e.id === ea.id || e.name === ea.name ? { ...e, ...ea } : e))
    : [ea, ...eas];
  const nextKeys = keys.some((k) => k.key === lic.key)
    ? keys
    : [lic, ...keys];
  return { eas: nextEas, keys: nextKeys };
}
