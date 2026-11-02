/**
 * Payment provider interfaces.
 * These do NOT pretend to charge money when providers are unconfigured.
 */

function readViteEnv(name) {
  try {
    const env = import.meta.env;
    if (env && typeof env === "object" && name in env) return env[name] || "";
  } catch {
    // Node tests / non-Vite runtimes have no import.meta.env
  }
  return "";
}

export function paymentEnv() {
  const payfast = {
    merchantId: readViteEnv("VITE_PAYFAST_MERCHANT_ID"),
    merchantKey: readViteEnv("VITE_PAYFAST_MERCHANT_KEY"),
    passphraseConfigured: readViteEnv("VITE_PAYFAST_PASS_CONFIGURED") === "true",
    sandbox: readViteEnv("VITE_PAYFAST_SANDBOX") !== "false",
  };
  const stripe = {
    publishableKey: readViteEnv("VITE_STRIPE_PUBLISHABLE_KEY"),
  };
  return {
    payfast,
    stripe,
    payfastReady: Boolean(payfast.merchantId && payfast.merchantKey),
    stripeReady: Boolean(stripe.publishableKey),
  };
}

export function describePaymentStatus() {
  const env = paymentEnv();
  if (env.payfastReady) {
    return {
      provider: "payfast",
      ready: true,
      message: "PayFast public keys are present. Checkout still requires the server webhook secret and ITN verification endpoint.",
    };
  }
  if (env.stripeReady) {
    return {
      provider: "stripe",
      ready: true,
      message: "Stripe publishable key is present. Checkout still requires STRIPE_SECRET_KEY on the server and webhook signing.",
    };
  }
  return {
    provider: "none",
    ready: false,
    message: "Payments are not configured. Set PayFast or Stripe env vars before accepting live charges.",
  };
}

/**
 * Create a checkout intent. Returns a structured result that never claims success
 * when the provider cannot complete a real charge.
 */
export async function createCheckoutIntent({ plan, ownerId, returnUrl }) {
  const status = describePaymentStatus();
  if (!plan) {
    return { ok: false, status: "failed", error: "Choose a plan first." };
  }
  if (!status.ready) {
    return {
      ok: false,
      status: "requires_configuration",
      provider: "none",
      error: status.message,
      nextSteps: [
        "Add VITE_PAYFAST_MERCHANT_ID / VITE_PAYFAST_MERCHANT_KEY or VITE_STRIPE_PUBLISHABLE_KEY",
        "Add server secrets (PayFast passphrase or STRIPE_SECRET_KEY) in Vercel",
        "Configure /api/swagstack-payments webhook verification",
        "Complete provider account approval for digital services",
      ],
    };
  }

  // Public keys alone are not enough to create a verified payment session.
  // The serverless handler must confirm secrets; until then we refuse to fake success.
  try {
    const response = await fetch("/api/swagstack-payments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_checkout",
        planId: plan.id,
        ownerId,
        returnUrl,
        amountCents: plan.price_cents,
        setupFeeCents: plan.setup_fee_cents || 0,
        currency: plan.currency || "ZAR",
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) {
      return {
        ok: false,
        status: body.status || "requires_configuration",
        provider: body.provider || status.provider,
        error: body.error || status.message,
        nextSteps: body.nextSteps || [],
      };
    }
    return body;
  } catch {
    return {
      ok: false,
      status: "requires_configuration",
      provider: status.provider,
      error: "Payment API is unreachable. Deploy /api/swagstack-payments and configure provider secrets.",
    };
  }
}

export function formatMoney(cents, currency = "ZAR") {
  const amount = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
