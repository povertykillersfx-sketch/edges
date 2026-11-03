const DEFAULT_BASE = "http://157.230.1.186:5000";

export function brokerBase() {
  return String(process.env.mt5_url || process.env.MT5_URL || DEFAULT_BASE).replace(/\/$/, "");
}

function cleanLogin(value) {
  const login = String(value || "").trim();
  return /^\d{3,20}$/.test(login) ? login : "";
}

function cleanServer(value) {
  const server = String(value || "").trim();
  return /^[A-Za-z0-9 ._+()-]{1,80}$/.test(server) ? server : "";
}

export function cleanSession(value) {
  const id = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{8,80}$/.test(id) ? id : "";
}

function failureReason(code) {
  if (code === "INVALID_ACCOUNT") {
    return "The MetaTrader login was refused. Check the account, password, and server.";
  }
  if (code === "CONNECT_ERROR") return "That broker server could not be opened. Try another server.";
  return "The broker server did not respond. Try again.";
}

async function readSession(response) {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return { id: "", reason: "The broker server did not respond. Try again." };
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);
      if (typeof data === "string") {
        const id = cleanSession(data);
        return id
          ? { id, reason: "" }
          : { id: "", reason: "The broker server did not respond. Try again." };
      }
      return { id: "", reason: failureReason(String(data?.code || "")) };
    } catch {
      return { id: "", reason: "The broker server did not respond. Try again." };
    }
  }
  const id = cleanSession(trimmed.replace(/^"|"$/g, ""));
  return id ? { id, reason: "" } : { id: "", reason: "The broker server did not respond. Try again." };
}

export async function connectBroker({ login, password, server, base, fetchImpl = fetch }) {
  const account = cleanLogin(login);
  const host = cleanServer(server);
  const secret = String(password || "");
  if (!account || !host || secret.length < 1 || secret.length > 128) {
    return { ok: false, reason: "Enter the MetaTrader account number and password." };
  }
  const root = String(base || brokerBase()).replace(/\/$/, "");
  let response;
  try {
    const url = new URL("/ConnectEx", `${root}/`);
    url.searchParams.set("user", account);
    url.searchParams.set("password", secret);
    url.searchParams.set("server", host);
    url.searchParams.set("connectTimeoutSeconds", "45");
    response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json, text/plain" },
    });
  } catch {
    return { ok: false, reason: "The broker server did not respond. Try again." };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: "The broker server refused the connection." };
  }
  const session = await readSession(response);
  if (!session.id) {
    return { ok: false, reason: session.reason || "That broker server could not be opened. Try another server." };
  }
  return { ok: true, id: session.id, login: account, server: host };
}

export async function stopBroker({ id, base, fetchImpl = fetch }) {
  const session = cleanSession(id);
  if (!session) return { ok: false };
  const root = String(base || brokerBase()).replace(/\/$/, "");
  try {
    const url = new URL("/Disconnect", `${root}/`);
    url.searchParams.set("id", session);
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json, text/plain" },
    });
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
        base: brokerBase(),
      });
      res.status(result.ok ? 200 : 422).json(result);
      return;
    }
    if (req.method === "DELETE") {
      await stopBroker({ id: body.id, base: brokerBase() });
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ ok: false, reason: "Enter the MetaTrader account number and password." });
  } catch {
    res.status(502).json({ ok: false, reason: "The broker server did not respond. Try again." });
  }
}
