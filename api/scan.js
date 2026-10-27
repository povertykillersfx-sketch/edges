import { chartKey, readChart } from "./readChart.js";

function keyProbe() {
  const skip =
    /^(VERCEL_|AWS_|LAMBDA_|NODE_|npm_|CI$|TZ$|LANG$|LC_|PATH$|HOME$|PWD$|_|HOSTNAME$|SHLVL$|USER$|SHELL$|DEBIAN_|NOW_|NEXT_|PYTHON|NVM_|COREPACK|YARN_|PNPM_|TURBO_|NX_)/;
  const names = Object.keys(process.env)
    .filter((name) => !skip.test(name))
    .sort();
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
