import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LicenseKey, ManagedEa } from './AppState';
import { mergeTestLicenseCatalog } from './demo/testLicenseSeed';

/** Shared storage keys — portal License Keys + app Activate MUST use these. */
export const EAS_STORAGE_KEY = 'edges-managed-eas-v1';
export const LICENSE_KEYS_STORAGE_KEY = 'edges-license-keys-v1';

export function normalizeLicenseKey(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export async function loadLicenseCatalog(): Promise<{
  eas: ManagedEa[];
  keys: LicenseKey[];
}> {
  const [easRaw, keysRaw] = await Promise.all([
    AsyncStorage.getItem(EAS_STORAGE_KEY),
    AsyncStorage.getItem(LICENSE_KEYS_STORAGE_KEY),
  ]);
  let eas: ManagedEa[] = [];
  let keys: LicenseKey[] = [];
  try {
    if (easRaw) {
      const parsed = JSON.parse(easRaw) as ManagedEa[];
      if (Array.isArray(parsed)) eas = parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    if (keysRaw) {
      const parsed = JSON.parse(keysRaw) as LicenseKey[];
      if (Array.isArray(parsed)) keys = parsed;
    }
  } catch {
    /* ignore */
  }
  return mergeTestLicenseCatalog(eas, keys);
}

export async function saveLicenseCatalog(
  eas: ManagedEa[],
  keys: LicenseKey[],
) {
  await Promise.all([
    AsyncStorage.setItem(EAS_STORAGE_KEY, JSON.stringify(eas)),
    AsyncStorage.setItem(LICENSE_KEYS_STORAGE_KEY, JSON.stringify(keys)),
  ]);
}

export async function findIssuedLicense(
  rawKey: string,
): Promise<{ key: LicenseKey; eas: ManagedEa[]; keys: LicenseKey[] } | null> {
  const normalized = normalizeLicenseKey(rawKey);
  const { eas, keys } = await loadLicenseCatalog();
  const key = keys.find((k) => normalizeLicenseKey(k.key) === normalized);
  if (!key) return null;
  return { key, eas, keys };
}
