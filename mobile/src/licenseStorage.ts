import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredEa = {
  id: string;
  name: string;
  pictureUri: string | null;
  symbols: string[];
  createdAt: string;
};

export type StoredLicenseKey = {
  id: string;
  eaId: string;
  eaName: string;
  key: string;
  createdAt: string;
  eaPictureUri: string | null;
  eaSymbols: string[];
};

/** Shared storage keys — portal License Keys + app Activate MUST use these. */
export const EAS_STORAGE_KEY = 'edges-managed-eas-v1';
export const LICENSE_KEYS_STORAGE_KEY = 'edges-license-keys-v1';

export function normalizeLicenseKey(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export async function loadLicenseCatalog(): Promise<{
  eas: StoredEa[];
  keys: StoredLicenseKey[];
}> {
  const [easRaw, keysRaw] = await Promise.all([
    AsyncStorage.getItem(EAS_STORAGE_KEY),
    AsyncStorage.getItem(LICENSE_KEYS_STORAGE_KEY),
  ]);
  let eas: StoredEa[] = [];
  let keys: StoredLicenseKey[] = [];
  try {
    if (easRaw) {
      const parsed = JSON.parse(easRaw) as StoredEa[];
      if (Array.isArray(parsed)) eas = parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    if (keysRaw) {
      const parsed = JSON.parse(keysRaw) as StoredLicenseKey[];
      if (Array.isArray(parsed)) keys = parsed;
    }
  } catch {
    /* ignore */
  }
  return { eas, keys };
}

export async function saveLicenseCatalog(
  eas: StoredEa[],
  keys: StoredLicenseKey[],
) {
  await Promise.all([
    AsyncStorage.setItem(EAS_STORAGE_KEY, JSON.stringify(eas)),
    AsyncStorage.setItem(LICENSE_KEYS_STORAGE_KEY, JSON.stringify(keys)),
  ]);
}

export async function findIssuedLicense(
  rawKey: string,
): Promise<{
  key: StoredLicenseKey;
  eas: StoredEa[];
  keys: StoredLicenseKey[];
} | null> {
  const normalized = normalizeLicenseKey(rawKey);
  const { eas, keys } = await loadLicenseCatalog();
  // Prefer the most recently issued match (keys are prepended on generate).
  const matches = keys.filter((k) => normalizeLicenseKey(k.key) === normalized);
  const key = matches[0];
  if (!key) return null;
  return { key, eas, keys };
}

/**
 * Build the activated session strictly from the license → EA mapping.
 * Snapshot on the key is authoritative; live EA only refreshes if same eaId.
 */
export function sessionFromLicenseKey(
  issued: StoredLicenseKey,
  eas: StoredEa[],
): {
  licenseKey: string;
  eaId: string;
  name: string;
  pictureUri: string | null;
  symbols: string[];
  activatedAt: string;
} {
  const live = eas.find((e) => e.id === issued.eaId);
  // Snapshot-first: never fall back to a different EA (e.g. old Aurora seed).
  const name =
    live && live.id === issued.eaId && live.name.trim()
      ? live.name.trim()
      : (issued.eaName || '').trim();
  const pictureUri =
    live && live.id === issued.eaId && live.pictureUri
      ? live.pictureUri
      : issued.eaPictureUri;
  const symbols =
    live && live.id === issued.eaId && live.symbols?.length
      ? [...live.symbols]
      : [...(issued.eaSymbols ?? [])];

  return {
    licenseKey: issued.key,
    eaId: issued.eaId,
    name: name || 'EA',
    pictureUri,
    symbols,
    activatedAt: new Date().toISOString(),
  };
}
