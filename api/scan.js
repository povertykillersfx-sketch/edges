import { chartKey, readChart } from "./readChart.js";

function keyProbe() {
  const names = Object.keys(process.env).filter((name) =>
    /open.?ai|openai|gpt|chart.?key|open_ai/i.test(name)
  );
  return {
    connected: Boolean(chartKey()),
    names: names.map((name) => ({ name, length: String(process.env[name] || "").trim().length })),
  };
}

export default async function handler(req, res) {
  if (req.method === "GET" && req.query?.probe === "1") {
    res.status(200).json(keyProbe());
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, reason: "Upload a chart image." });
    return;
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  try {
    const result = await readChart({ image: body.image, apiKey: chartKey() });
    res.status(result.ok ? 200 : 422).json(result);
  } catch {
    res.status(502).json({ ok: false, reason: "The chart reader did not respond. Try again." });
  }
}
