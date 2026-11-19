import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/** Shared storage keys — portal License Keys + app Activate MUST use these. */
export const EAS_STORAGE_KEY = 'edges-managed-eas-v1';
export const LICENSE_KEYS_STORAGE_KEY = 'edges-license-keys-v1';

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

/**
 * In-memory catalog for the SPA session.
 * Survives route changes; backs Activate when localStorage quota drops picture writes.
 */
let memoryEas: StoredEa[] = [];
let memoryKeys: StoredLicenseKey[] = [];

export function normalizeLicenseKey(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

function webLocalGet(key: string): string | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webLocalSet(key: string, value: string): boolean {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function compactForDisk(eas: StoredEa[], keys: StoredLicenseKey[]) {
  // Keep EA pictures when possible; strip huge data-URLs from key snapshots
  // (Activate resolves picture via eaId → EA, or key snapshot if present).
  const compactKeys = keys.map((k) => ({
    ...k,
    eaPictureUri:
      k.eaPictureUri && k.eaPictureUri.startsWith('data:')
        ? null
        : k.eaPictureUri,
  }));
  return { eas, keys: compactKeys };
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of secondary) map.set(row.id, row);
  for (const row of primary) map.set(row.id, row);
  return Array.from(map.values());
}

function mergeKeysByKeyString(
  primary: StoredLicenseKey[],
  secondary: StoredLicenseKey[],
): StoredLicenseKey[] {
  const map = new Map<string, StoredLicenseKey>();
  for (const row of secondary) map.set(normalizeLicenseKey(row.key), row);
  for (const row of primary) map.set(normalizeLicenseKey(row.key), row);
  // Newest first: primary (memory) order, then leftovers
  const seen = new Set<string>();
  const out: StoredLicenseKey[] = [];
  for (const row of [...primary, ...secondary]) {
    const k = normalizeLicenseKey(row.key);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(map.get(k)!);
  }
  return out;
}

export function getMemoryCatalog() {
  return { eas: memoryEas, keys: memoryKeys };
}

export function setMemoryCatalog(eas: StoredEa[], keys: StoredLicenseKey[]) {
  memoryEas = eas;
  memoryKeys = keys;
}

export async function loadLicenseCatalog(): Promise<{
  eas: StoredEa[];
  keys: StoredLicenseKey[];
}> {
  let diskEas: StoredEa[] = [];
  let diskKeys: StoredLicenseKey[] = [];

  // Prefer direct localStorage on web (same origin as portal + activate).
  const easRaw =
    webLocalGet(EAS_STORAGE_KEY) ?? (await AsyncStorage.getItem(EAS_STORAGE_KEY));
  const keysRaw =
    webLocalGet(LICENSE_KEYS_STORAGE_KEY) ??
    (await AsyncStorage.getItem(LICENSE_KEYS_STORAGE_KEY));

  try {
    if (easRaw) {
      const parsed = JSON.parse(easRaw) as StoredEa[];
      if (Array.isArray(parsed)) diskEas = parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    if (keysRaw) {
      const parsed = JSON.parse(keysRaw) as StoredLicenseKey[];
      if (Array.isArray(parsed)) diskKeys = parsed;
    }
  } catch {
    /* ignore */
  }

  // Memory wins for keys/EAs written this session (portal generate → activate).
  const eas = mergeById(memoryEas, diskEas);
  const keys = mergeKeysByKeyString(memoryKeys, diskKeys);
  memoryEas = eas;
  memoryKeys = keys;
  return { eas, keys };
}

export async function saveLicenseCatalog(
  eas: StoredEa[],
  keys: StoredLicenseKey[],
) {
  memoryEas = eas;
  memoryKeys = keys;

  const full = JSON.stringify({ eas, keys });
  const compact = compactForDisk(eas, keys);

  // Keys first (must survive for Activate), then EAs. Compact strips data-URL
  // snapshots from keys so large EA photos cannot block key persistence.
  const easJson = JSON.stringify(compact.eas);
  const keysJson = JSON.stringify(compact.keys);

  let keysOk = webLocalSet(LICENSE_KEYS_STORAGE_KEY, keysJson);
  let easOk = webLocalSet(EAS_STORAGE_KEY, easJson);

  if (!easOk) {
    // Quota: drop EA data-URL pictures, keep ids/names/symbols for binding.
    const skinnyEas = eas.map((e) => ({
      ...e,
      pictureUri:
        e.pictureUri && e.pictureUri.startsWith('data:') ? null : e.pictureUri,
    }));
    easOk = webLocalSet(EAS_STORAGE_KEY, JSON.stringify(skinnyEas));
  }

  if (!keysOk) {
    // Retry keys after freeing space from skinny EA rewrite.
    keysOk = webLocalSet(LICENSE_KEYS_STORAGE_KEY, keysJson);
  }

  try {
    // Prefer keys write first via AsyncStorage too (same localStorage on web).
    await AsyncStorage.setItem(LICENSE_KEYS_STORAGE_KEY, keysJson);
    try {
      await AsyncStorage.setItem(EAS_STORAGE_KEY, easJson);
    } catch {
      const skinnyEas = eas.map((e) => ({
        ...e,
        pictureUri:
          e.pictureUri && e.pictureUri.startsWith('data:') ? null : e.pictureUri,
      }));
      await AsyncStorage.setItem(EAS_STORAGE_KEY, JSON.stringify(skinnyEas));
    }
  } catch {
    // Memory catalog still holds full data for this SPA session.
    console.warn(
      '[edges] license catalog disk write failed; using in-memory bridge',
      full.length,
      { keysOk, easOk },
    );
  }
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
