/**
 * Demo-only mentor auth helpers.
 * Plaintext passwords are NEVER stored here — only a salted SHA-256 digest.
 */
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_SALT = 'edges-ea-demo-v1';
const PROFILES_KEY = 'edges-mentor-profiles-v1';

/** Demo mentor email (identifier only). */
export const DEMO_MENTOR_EMAIL = 'mukundimukhuba8@gmail.com';

/**
 * Salted SHA-256 of the local mock password (generated offline).
 * Plaintext lives only in gitignored `demoSeed.local.json` on the agent machine.
 */
export const DEMO_MENTOR_PASSWORD_SHA256 =
  'cf2332b0090f1d94d668ade90e7188fd0fcf51eeea412783bd669c45e5db1fa4';

export type SignupRequest = {
  email: string;
  mentorName: string;
  name: string;
  contact: string;
  createdAt: string;
};

/** Signed-in mentor profile shown on Profile + drawer. */
export type MentorSession = {
  email: string;
  mentorName: string;
  name: string;
  contact: string;
  createdAt: string;
  /** demo | pending | approved */
  status: 'demo' | 'pending' | 'approved';
};

type StoredProfile = MentorSession & {
  passwordHash: string;
};

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${DEMO_SALT}:${password}`,
  );
}

export function demoMentorSession(): MentorSession {
  return {
    email: DEMO_MENTOR_EMAIL,
    mentorName: 'Mukundi',
    name: 'Mukundi Mukhuba',
    contact: '+27 82 000 0001',
    createdAt: '2026-01-15T10:00:00.000Z',
    status: 'demo',
  };
}

async function loadProfiles(): Promise<Record<string, StoredProfile>> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredProfile>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveProfiles(map: Record<string, StoredProfile>) {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(map));
}

export async function verifyDemoMentor(
  email: string,
  password: string,
): Promise<MentorSession | null> {
  const normalized = email.trim().toLowerCase();
  const digest = await hashPassword(password);

  if (
    normalized === DEMO_MENTOR_EMAIL &&
    digest === DEMO_MENTOR_PASSWORD_SHA256
  ) {
    // Prefer any locally edited/registered overlay for the demo email
    const map = await loadProfiles();
    const stored = map[normalized];
    if (stored) {
      const { passwordHash: _h, ...session } = stored;
      return { ...demoMentorSession(), ...session, status: 'demo' };
    }
    return demoMentorSession();
  }

  const map = await loadProfiles();
  const stored = map[normalized];
  if (!stored || stored.passwordHash !== digest) return null;
  const { passwordHash: _h, ...session } = stored;
  return session;
}

export async function registerMentor(fields: {
  email: string;
  mentorName: string;
  name: string;
  contact: string;
  password: string;
}): Promise<MentorSession> {
  const email = fields.email.trim().toLowerCase();
  const passwordHash = await hashPassword(fields.password);
  const session: MentorSession = {
    email,
    mentorName: fields.mentorName.trim(),
    name: fields.name.trim(),
    contact: fields.contact.trim(),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  const map = await loadProfiles();
  map[email] = { ...session, passwordHash };
  await saveProfiles(map);
  return session;
}

export function validateSignup(fields: {
  email: string;
  mentorName: string;
  name: string;
  contact: string;
  password: string;
  confirm: string;
}): string | null {
  if (!fields.email.trim() || !fields.email.includes('@')) return 'enter a valid email';
  if (!fields.mentorName.trim()) return 'mentor name required';
  if (!fields.name.trim()) return 'name required';
  if (!fields.contact.trim()) return 'contact number required';
  if (fields.password.length < 8) return 'password must be at least 8 characters';
  if (fields.password !== fields.confirm) return 'passwords do not match';
  return null;
}
