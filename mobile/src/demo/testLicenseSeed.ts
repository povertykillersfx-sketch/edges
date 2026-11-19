import type { LicenseKey, ManagedEa } from '../AppState';

/**
 * Optional demo catalog — NOT merged into activate by default.
 * Real portal-issued keys must map 1:1 to the EA they were generated for.
 */
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

/**
 * Pass-through only — never inject Aurora or remap foreign keys.
 * Portal-generated keys + EAs in storage are the source of truth.
 */
export function mergeTestLicenseCatalog(
  eas: ManagedEa[],
  keys: LicenseKey[],
): { eas: ManagedEa[]; keys: LicenseKey[] } {
  return {
    eas: Array.isArray(eas) ? eas : [],
    keys: Array.isArray(keys) ? keys : [],
  };
}
