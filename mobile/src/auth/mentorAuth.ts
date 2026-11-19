/**
 * Demo-only mentor auth helpers.
 * Plaintext passwords are NEVER stored here — only a salted SHA-256 digest.
 */
import * as Crypto from 'expo-crypto';

const DEMO_SALT = 'edges-ea-demo-v1';

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

export type MentorSession = {
  email: string;
  mentorName: string;
};

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${DEMO_SALT}:${password}`,
  );
}

export async function verifyDemoMentor(
  email: string,
  password: string,
): Promise<MentorSession | null> {
  const normalized = email.trim().toLowerCase();
  if (normalized !== DEMO_MENTOR_EMAIL) return null;
  const digest = await hashPassword(password);
  if (digest !== DEMO_MENTOR_PASSWORD_SHA256) return null;
  return { email: DEMO_MENTOR_EMAIL, mentorName: 'Mukundi' };
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
