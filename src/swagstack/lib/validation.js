const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_RE = /^(https?:\/\/|\/|#|mailto:|tel:)/i;
const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function sanitizeText(value, { max = 500 } = {}) {
  const text = String(value ?? "").replace(/[<>]/g, "").trim();
  return text.slice(0, max);
}

export function validateEmail(email) {
  const value = sanitizeText(email, { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(value)) return { ok: false, error: "Enter a valid email address." };
  return { ok: true, value };
}

export function validatePassword(password) {
  const value = String(password ?? "");
  if (value.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  return { ok: true, value };
}

export function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function validateSlug(slug) {
  const value = slugify(slug);
  if (!value || !SLUG_RE.test(value)) {
    return { ok: false, error: "Use a lowercase slug with letters, numbers, and hyphens." };
  }
  const reserved = new Set(["admin", "studio", "api", "www", "app", "mail", "ftp", "s", "p"]);
  if (reserved.has(value)) return { ok: false, error: "That subdomain is reserved." };
  return { ok: true, value };
}

export function validateUrl(url, { optional = false } = {}) {
  const value = sanitizeText(url, { max: 2000 });
  if (!value) return optional ? { ok: true, value: "" } : { ok: false, error: "URL is required." };
  if (!URL_RE.test(value)) return { ok: false, error: "URL must start with http(s)://, /, #, mailto:, or tel:." };
  return { ok: true, value };
}

export function validateColor(color) {
  const value = sanitizeText(color, { max: 7 });
  if (!COLOR_RE.test(value)) return { ok: false, error: "Use a hex color like #22d3ee." };
  return { ok: true, value };
}

export function validateServices(services) {
  if (!Array.isArray(services)) return { ok: false, error: "Services must be a list." };
  if (services.length > 40) return { ok: false, error: "Too many services (max 40)." };
  const cleaned = services.map((item, index) => {
    const name = sanitizeText(item?.name, { max: 80 });
    const price = sanitizeText(item?.price, { max: 40 });
    const description = sanitizeText(item?.description, { max: 280 });
    if (!name) throw new Error(`Service ${index + 1} needs a name.`);
    return { name, price, description };
  });
  return { ok: true, value: cleaned };
}

export function validateUpload(file) {
  if (!file) return { ok: false, error: "Choose an image file." };
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Only JPEG, PNG, WebP, or GIF images are allowed." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Images must be 5MB or smaller." };
  }
  return { ok: true, value: file };
}

export function stripScripts(config) {
  const seen = new WeakSet();
  function walk(node) {
    if (typeof node === "string") {
      return node
        .replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
        .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
        .replace(/javascript:/gi, "");
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      if (seen.has(node)) return {};
      seen.add(node);
      const out = {};
      for (const [key, value] of Object.entries(node)) {
        out[sanitizeText(key, { max: 64 }) || key] = walk(value);
      }
      return out;
    }
    return node;
  }
  return walk(config);
}

export function validateWebsiteConfig(config, schemaFields = []) {
  const safe = stripScripts(config || {});
  const errors = [];
  const next = { ...safe };

  for (const field of schemaFields) {
    const key = field.key;
    const raw = next[key];
    if (field.type === "color" && raw) {
      const result = validateColor(raw);
      if (!result.ok) errors.push(`${field.label}: ${result.error}`);
      else next[key] = result.value;
    } else if (field.type === "url" && raw) {
      const result = validateUrl(raw, { optional: true });
      if (!result.ok) errors.push(`${field.label}: ${result.error}`);
      else next[key] = result.value;
    } else if (field.type === "services") {
      try {
        const result = validateServices(raw || []);
        if (!result.ok) errors.push(result.error);
        else next[key] = result.value;
      } catch (error) {
        errors.push(error.message);
      }
    } else if (typeof raw === "string") {
      next[key] = sanitizeText(raw, { max: field.type === "textarea" ? 4000 : 500 });
    }
  }

  if (errors.length) return { ok: false, errors, value: next };
  return { ok: true, value: next, errors: [] };
}

export { ALLOWED_MIME, MAX_UPLOAD_BYTES };
