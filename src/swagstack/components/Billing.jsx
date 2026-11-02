import { useEffect, useState } from "react";
import { listPayments, listPlans, listSubscriptions, startPlanCheckout, updateProfile } from "../lib/api.js";
import { describePaymentStatus, formatMoney } from "../lib/payments.js";

export function BillingPage({ profile, onProfile }) {
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const paymentStatus = describePaymentStatus();

  useEffect(() => {
    Promise.all([listPlans(), listSubscriptions(profile.id), listPayments(profile.id)])
      .then(([p, s, pay]) => {
        setPlans(p);
        setSubs(s);
        setPayments(pay);
      })
      .catch((err) => setError(err.message || "Billing data unavailable."));
  }, [profile.id]);

  async function choosePlan(plan) {
    setError("");
    setInfo("");
    try {
      const result = await startPlanCheckout({
        ownerId: profile.id,
        plan,
        returnUrl: `${window.location.origin}${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/studio/billing`,
      });
      if (!result.ok) {
        setInfo(
          [
            result.intent?.error || "Checkout is not ready.",
            ...(result.intent?.nextSteps || []),
          ].join(" ")
        );
        const pay = await listPayments(profile.id);
        setPayments(pay);
        return;
      }
      if (result.intent?.checkoutUrl) {
        window.location.href = result.intent.checkoutUrl;
        return;
      }
      setInfo("Checkout session created, but no redirect URL was returned by the provider handler.");
    } catch (err) {
      setError(err.message || "Could not start checkout.");
    }
  }

  return (
    <div className="ss-page">
      <header className="ss-page-head">
        <div>
          <p className="ss-eyebrow">Billing</p>
          <h1>Plans & payments</h1>
          <p className="ss-lede">
            Provider status: <strong>{paymentStatus.provider}</strong> — {paymentStatus.message}
          </p>
        </div>
      </header>

      {error ? <p className="ss-error">{error}</p> : null}
      {info ? <p className="ss-info">{info}</p> : null}

      <section className="ss-plan-grid">
        {plans.map((plan) => (
          <article key={plan.id} className="ss-plan-card">
            <h2>{plan.name}</h2>
            <p className="ss-plan-price">{formatMoney(plan.price_cents, plan.currency)}</p>
            <p className="ss-muted">{plan.billing_interval.replace("_", " + ")}</p>
            {plan.setup_fee_cents ? <p>Setup {formatMoney(plan.setup_fee_cents, plan.currency)}</p> : null}
            <ul>
              {(plan.features || []).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button type="button" className="ss-btn ss-btn-primary" onClick={() => choosePlan(plan)}>
              {paymentStatus.ready ? "Checkout" : "Request checkout (needs config)"}
            </button>
          </article>
        ))}
      </section>

      <section className="ss-section">
        <h2>Subscriptions</h2>
        {!subs.length ? <p className="ss-muted">No subscriptions yet.</p> : null}
        {subs.map((sub) => (
          <p key={sub.id}>
            {sub.plan_id} · {sub.status} · {sub.provider}
          </p>
        ))}
      </section>

      <section className="ss-section">
        <h2>Payment history</h2>
        {!payments.length ? <p className="ss-muted">No payment records yet.</p> : null}
        {payments.map((pay) => (
          <p key={pay.id}>
            {formatMoney(pay.amount_cents, pay.currency)} · {pay.status} · {pay.description || pay.provider}
          </p>
        ))}
      </section>
    </div>
  );
}

export function AccountPage({ profile, onProfile }) {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    setError("");
    try {
      const next = await updateProfile(profile.id, { full_name: fullName });
      onProfile?.(next);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err.message || "Could not save profile.");
    }
  }

  return (
    <div className="ss-page">
      <header className="ss-page-head">
        <div>
          <p className="ss-eyebrow">Account</p>
          <h1>Profile</h1>
        </div>
      </header>
      <form className="ss-form ss-narrow" onSubmit={save}>
        <label>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          Email
          <input value={profile.email} disabled />
        </label>
        <p className="ss-muted">Role: {profile.role} · Plan: {profile.plan_id}</p>
        {error ? <p className="ss-error">{error}</p> : null}
        {message ? <p className="ss-info">{message}</p> : null}
        <button className="ss-btn ss-btn-primary" type="submit">
          Save
        </button>
      </form>
    </div>
  );
}
