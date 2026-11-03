import { brokerBase } from "./mt5.js";

export function readBrokerSearch(payload) {
  if (!Array.isArray(payload)) return [];
  const brokers = [];
  for (const item of payload) {
    const company = String(item?.companyName || "").trim().slice(0, 80);
    const seen = new Set();
    const servers = [];
    for (const row of Array.isArray(item?.results) ? item.results : []) {
      const name = String(row?.name || "").trim();
      if (!name || name.length > 80 || seen.has(name)) continue;
      seen.add(name);
      servers.push(name);
    }
    if (company && servers.length) brokers.push({ company, servers });
    if (brokers.length >= 20) break;
  }
  return brokers;
}

export async function searchBrokers(query, fetchImpl = fetch) {
  const q = String(query || "").trim();
  if (q.length < 2 || q.length > 40 || !/^[\p{L}\p{N} .&'+-]{2,40}$/u.test(q)) {
    return { ok: false, reason: "Type a broker name." };
  }
  let response;
  try {
    const url = new URL("/Search", `${brokerBase()}/`);
    url.searchParams.set("company", q);
    response = await fetchImpl(url, { headers: { accept: "application/json" } });
  } catch {
    return { ok: false, reason: "The broker search did not respond." };
  }
  if (!response.ok) return { ok: false, reason: "The broker search did not respond." };
  const payload = await response.json().catch(() => null);
  return { ok: true, brokers: readBrokerSearch(payload) };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, reason: "Type a broker name." });
    return;
  }
  const query = req.query?.q || new URL(req.url || "/", "http://desk.local").searchParams.get("q") || "";
  try {
    const result = await searchBrokers(query);
    res.status(result.ok ? 200 : 422).json(result);
  } catch {
    res.status(502).json({ ok: false, reason: "The broker search did not respond." });
  }
}
