/**
 * SwagStack payment checkout + webhook interface.
 * Does not claim success when provider secrets are missing.
 *
 * Vercel serverless export + Vite middleware compatible helpers.
 */

function readEnv(name) {
  return process.env[name] || "";
}

function paymentConfig() {
  const payfast = {
    merchantId: readEnv("PAYFAST_MERCHANT_ID") || readEnv("VITE_PAYFAST_MERCHANT_ID"),
    merchantKey: readEnv("PAYFAST_MERCHANT_KEY") || readEnv("VITE_PAYFAST_MERCHANT_KEY"),
    passphrase: readEnv("PAYFAST_PASSPHRASE"),
    sandbox: readEnv("PAYFAST_SANDBOX") !== "false",
  };
  const stripe = {
    secretKey: readEnv("STRIPE_SECRET_KEY"),
    publishableKey: readEnv("STRIPE_PUBLISHABLE_KEY") || readEnv("VITE_STRIPE_PUBLISHABLE_KEY"),
    webhookSecret: readEnv("STRIPE_WEBHOOK_SECRET"),
  };
  return {
    payfast,
    stripe,
    payfastReady: Boolean(payfast.merchantId && payfast.merchantKey && payfast.passphrase),
    stripeReady: Boolean(stripe.secretKey && stripe.publishableKey),
  };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function handleSwagstackPayments(req, res) {
  if (req.method === "GET") {
    const cfg = paymentConfig();
    return json(res, 200, {
      ok: true,
      payfastConfigured: cfg.payfastReady,
      stripeConfigured: cfg.stripeReady,
      message: cfg.payfastReady || cfg.stripeReady
        ? "At least one provider has server secrets."
        : "No payment provider secrets configured.",
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Use POST for checkout or webhook actions." });
  }

  const body = await readBody(req);
  const action = body.action || "create_checkout";
  const cfg = paymentConfig();

  if (action === "webhook") {
    // Real signature verification requires provider secrets and raw payload handling.
    if (!cfg.payfastReady && !cfg.stripeReady) {
      return json(res, 503, {
        ok: false,
        status: "requires_configuration",
        error: "Webhook rejected: payment provider secrets are not configured.",
      });
    }
    return json(res, 501, {
      ok: false,
      status: "requires_configuration",
      error: "Webhook verification endpoint is scaffolded. Wire provider signature checks before trusting events.",
    });
  }

  if (action !== "create_checkout") {
    return json(res, 400, { ok: false, error: "Unknown action." });
  }

  if (!cfg.payfastReady && !cfg.stripeReady) {
    return json(res, 503, {
      ok: false,
      status: "requires_configuration",
      provider: "none",
      error: "Payments are not configured on the server.",
      nextSteps: [
        "Set PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE or STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY",
        "Set STRIPE_WEBHOOK_SECRET or PayFast ITN validation",
        "Complete provider approval for digital services",
      ],
    });
  }

  // Secrets exist, but creating a live checkout session still needs provider SDK calls
  // and account/product configuration. Refuse to invent a fake paid session.
  return json(res, 501, {
    ok: false,
    status: "requires_configuration",
    provider: cfg.stripeReady ? "stripe" : "payfast",
    error:
      "Provider secrets detected, but live checkout session creation is not enabled until products, webhooks, and signature verification are finished.",
    nextSteps: [
      "Create plan products in the provider dashboard",
      "Implement signed checkout session creation",
      "Verify ITN/webhook signatures before activating subscriptions",
    ],
  });
}

export default async function handler(req, res) {
  return handleSwagstackPayments(req, res);
}
