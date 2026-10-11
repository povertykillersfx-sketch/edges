import { chartKey, readChart } from "./readChart.js";

export default async function handler(req, res) {
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
