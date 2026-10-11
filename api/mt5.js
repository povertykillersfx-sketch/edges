const DEFAULT_BASE = "http://159.203.191.196:8000";

export function brokerToken() {
  return process.env.mt5_api || process.env.MT5_API || process.env.API_TOKEN || "";
}

export function brokerBase() {
  return String(process.env.mt5_url || DEFAULT_BASE).replace(/\/$/, "");
}

function cleanLogin(value) {
  const login = String(value || "").trim();
  return /^\d{3,20}$/.test(login) ? login : "";
}

function cleanServer(value) {
  const server = String(value || "").trim();
  return /^[A-Za-z0-9 ._+()-]{1,80}$/.test(server) ? server : "";
}

async function brokerFetch(base, token, path, options, fetchImpl) {
  return fetchImpl(`${base}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
}

export async function connectBroker({ login, password, server, token, base, fetchImpl = fetch }) {
  const account = cleanLogin(login);
  const host = cleanServer(server);
  const secret = String(password || "");
  if (!account || !host || secret.length < 1 || secret.length > 128) {
    return { ok: false, reason: "Enter the MetaTrader account number and password." };
  }
  if (!token) return { ok: false, reason: "The broker server requires its API token." };
  const root = String(base || DEFAULT_BASE).replace(/\/$/, "");
  let listed;
  try {
    listed = await brokerFetch(root, token, "/api/accounts", { method: "GET" }, fetchImpl);
  } catch {
    return { ok: false, reason: "The broker server did not respond. Try again." };
  }
  if (listed.status === 401) return { ok: false, reason: "The broker server rejected its API token." };
  if (!listed.ok) return { ok: false, reason: "The broker server did not respond. Try again." };
  const accounts = await listed.json().catch(() => []);
  const existing = Array.isArray(accounts)
    ? accounts.find((item) => String(item?.login || "") === account && String(item?.server || "") === host)
    : null;
  let id = Number(existing?.id);
  try {
    if (Number.isInteger(id) && id > 0) {
      const updated = await brokerFetch(
        root,
        token,
        `/api/accounts/${id}`,
        { method: "PUT", body: JSON.stringify({ password: secret }) },
        fetchImpl
      );
      if (updated.status === 401) return { ok: false, reason: "The broker server rejected its API token." };
      if (!updated.ok) return { ok: false, reason: "The broker server did not respond. Try again." };
    } else {
      const created = await brokerFetch(
        root,
        token,
        "/api/accounts",
        {
          method: "POST",
          body: JSON.stringify({ name: host, login: account, password: secret, server: host }),
        },
        fetchImpl
      );
      if (created.status === 401) return { ok: false, reason: "The broker server rejected its API token." };
      if (!created.ok) return { ok: false, reason: "That broker server could not be opened. Try another server." };
      const body = await created.json().catch(() => null);
      id = Number(body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return { ok: false, reason: "The broker server did not respond. Try again." };
      }
    }
    const started = await brokerFetch(root, token, `/api/accounts/${id}/start`, { method: "POST" }, fetchImpl);
    if (started.status === 401) return { ok: false, reason: "The broker server rejected its API token." };
    if (!started.ok) {
      const detail = await started.json().catch(() => null);
      const already = String(detail?.detail || "").toLowerCase().includes("already running");
      if (!already) return { ok: false, reason: "That broker server could not be opened. Try another server." };
    }
  } catch {
    return { ok: false, reason: "The broker server did not respond. Try again." };
  }
  return { ok: true, id, login: account, server: host };
}

export async function stopBroker({ id, token, base, fetchImpl = fetch }) {
  const accountId = Number(id);
  if (!token || !Number.isInteger(accountId) || accountId <= 0) return { ok: false };
  const root = String(base || DEFAULT_BASE).replace(/\/$/, "");
  try {
    const response = await brokerFetch(root, token, `/api/accounts/${accountId}/stop`, { method: "POST" }, fetchImpl);
    return { ok: response.ok || response.status === 404 };
  } catch {
    return { ok: false };
  }
}

function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  const body = readJson(req);
  try {
    if (req.method === "POST") {
      const result = await connectBroker({
        login: body.login,
        password: body.password,
        server: body.server,
        token: brokerToken(),
        base: brokerBase(),
      });
      res.status(result.ok ? 200 : 422).json(result);
      return;
    }
    if (req.method === "DELETE") {
      await stopBroker({ id: body.id, token: brokerToken(), base: brokerBase() });
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ ok: false, reason: "Enter the MetaTrader account number and password." });
  } catch {
    res.status(502).json({ ok: false, reason: "The broker server did not respond. Try again." });
  }
}
