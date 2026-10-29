/** Owner bootstrap for Studio when Supabase email confirmation blocks first login.
 *  Password is never stored — only a SHA-256 digest, same pattern as desk admin.js.
 */
export const BOOTSTRAP_EMAIL = "mukundimukhuba8@gmail.com";
export const BOOTSTRAP_PASSWORD_HASH =
  "18026064be7ec28f428f49e9c93cc0c1f86d3883f11189805f592298467663c9";
export const BOOTSTRAP_USER_ID = "00000000-0000-4000-8000-000000000001";

const SESSION_KEY = "ss_bootstrap_session";
const SITES_KEY = "ss_bootstrap_sites";

function cleanPassword(value) {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export async function hashPassword(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cleanPassword(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function matchBootstrapCredentials(email, password) {
  if (String(email || "").trim().toLowerCase() !== BOOTSTRAP_EMAIL) return false;
  const digest = await hashPassword(password);
  return digest === BOOTSTRAP_PASSWORD_HASH;
}

export function bootstrapProfile() {
  return {
    id: BOOTSTRAP_USER_ID,
    email: BOOTSTRAP_EMAIL,
    full_name: "Mukundi Mukhuba",
    role: "super_admin",
    plan_id: "agency",
    status: "active",
    bootstrap: true,
  };
}

export function saveBootstrapSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ userId: BOOTSTRAP_USER_ID, email: BOOTSTRAP_EMAIL, at: Date.now() })
  );
}

export function clearBootstrapSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function loadBootstrapSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email?.toLowerCase() !== BOOTSTRAP_EMAIL) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadLocalSites() {
  try {
    return JSON.parse(localStorage.getItem(SITES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalSites(sites) {
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
}

export function upsertLocalSite(site) {
  const sites = loadLocalSites();
  const index = sites.findIndex((row) => row.id === site.id);
  if (index >= 0) sites[index] = site;
  else sites.unshift(site);
  saveLocalSites(sites);
  return site;
}

export function getLocalSite(id) {
  return loadLocalSites().find((row) => row.id === id) || null;
}
