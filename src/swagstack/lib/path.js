/** Vite BASE_URL is "/" locally and "/edges/" on GitHub Pages project site. */
export function appBase() {
  try {
    const raw = import.meta.env.BASE_URL || "/";
    if (!raw || raw === "/") return "";
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
  } catch {
    return "";
  }
}

export function withBase(path) {
  const base = appBase();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}` || "/";
}

export function stripBase(pathname = window.location.pathname) {
  const base = appBase();
  const raw = pathname || "/";
  if (!base) return raw;
  if (raw === base) return "/";
  if (raw.startsWith(`${base}/`)) return raw.slice(base.length) || "/";
  return raw;
}

export function studioPath(pathname = window.location.pathname) {
  const normal = stripBase(pathname).replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return normal;
}

export function isSwagStackPath(pathname = window.location.pathname) {
  const p = studioPath(pathname);
  return p === "/studio" || p.startsWith("/studio/") || p.startsWith("/s/");
}

export function parseStudioRoute(pathname = window.location.pathname) {
  const p = studioPath(pathname);

  if (p.startsWith("/s/")) {
    const slug = p.slice(3).split("/")[0] || "";
    return { name: "published", slug, path: p };
  }

  if (p === "/studio" || p === "/studio/") return { name: "home", path: "/studio" };

  const parts = p.replace(/^\/studio\/?/, "").split("/").filter(Boolean);
  const [a, b, c] = parts;

  if (!a) return { name: "home", path: "/studio" };
  if (a === "login") return { name: "login", path: p };
  if (a === "signup") return { name: "signup", path: p };
  if (a === "reset") return { name: "reset", path: p };
  if (a === "templates") return { name: "templates", path: p };
  if (a === "billing") return { name: "billing", path: p };
  if (a === "account") return { name: "account", path: p };
  if (a === "admin") return { name: "admin", tab: b || "overview", path: p };
  if (a === "sites" && b === "new") return { name: "new-site", templateId: c || "", path: p };
  if (a === "sites" && b && c === "edit") return { name: "editor", websiteId: b, path: p };
  if (a === "sites" && b && c === "domains") return { name: "domains", websiteId: b, path: p };
  if (a === "sites" && b) return { name: "site", websiteId: b, path: p };
  if (a === "dashboard") return { name: "dashboard", path: p };
  return { name: "home", path: "/studio" };
}

export function navigateStudio(path, { replace = false } = {}) {
  const logical = path.startsWith("/") ? path : `/studio/${path}`;
  const next = withBase(logical);
  if (replace) window.history.replaceState({ swagstack: next }, "", next);
  else window.history.pushState({ swagstack: next }, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function assignStudio(path) {
  window.location.assign(withBase(path.startsWith("/") ? path : `/studio/${path}`));
}
