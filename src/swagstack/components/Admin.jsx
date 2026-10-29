import { useEffect, useState } from "react";
import {
  adminListAudit,
  adminListCustomers,
  adminListWebsites,
  adminSetCustomerStatus,
  adminSuspendWebsite,
  adminUpsertPlan,
  listPlans,
} from "../lib/api.js";
import { formatMoney } from "../lib/payments.js";

export function AdminDashboard({ profile, tab = "overview" }) {
  const [customers, setCustomers] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [plans, setPlans] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reload() {
    const [c, w, p, a] = await Promise.all([
      adminListCustomers(),
      adminListWebsites(),
      listPlans(),
      adminListAudit(),
    ]);
    setCustomers(c);
    setWebsites(w);
    setPlans(p);
    setAudit(a);
  }

  useEffect(() => {
    reload().catch((err) => setError(err.message || "Admin data unavailable. Confirm super_admin role and schema."));
  }, []);

  if (profile.role !== "super_admin") {
    return <div className="ss-page"><p className="ss-error">Super-admin access required.</p></div>;
  }

  async function toggleCustomer(user) {
    const next = user.status === "active" ? "suspended" : "active";
    try {
      await adminSetCustomerStatus(user.id, next, profile.id);
      setMessage(`Customer ${user.email} set to ${next}.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function suspendSite(site) {
    try {
      await adminSuspendWebsite(site.id, profile.id);
      setMessage(`Suspended ${site.slug}.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePlan(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const plan = {
      id: String(form.get("id") || "").trim(),
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim(),
      price_cents: Number(form.get("price_cents") || 0),
      currency: "ZAR",
      billing_interval: String(form.get("billing_interval") || "monthly"),
      setup_fee_cents: Number(form.get("setup_fee_cents") || 0),
      max_websites: Number(form.get("max_websites") || 1),
      max_storage_mb: Number(form.get("max_storage_mb") || 100),
      custom_domain: form.get("custom_domain") === "on",
      features: String(form.get("features") || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      active: true,
      sort_order: Number(form.get("sort_order") || 0),
    };
    try {
      await adminUpsertPlan(plan, profile.id);
      setMessage(`Plan ${plan.id} saved.`);
      event.currentTarget.reset();
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="ss-page">
      <header className="ss-page-head">
        <div>
          <p className="ss-eyebrow">Super-admin</p>
          <h1>Platform control</h1>
          <p className="ss-lede">Customers, websites, plans, and audit activity.</p>
        </div>
      </header>

      <nav className="ss-admin-tabs">
        {["overview", "customers", "websites", "plans", "audit"].map((name) => (
          <a key={name} className={tab === name ? "active" : ""} href={`/studio/admin/${name}`}>
            {name}
          </a>
        ))}
      </nav>

      {error ? <p className="ss-error">{error}</p> : null}
      {message ? <p className="ss-info">{message}</p> : null}

      {(tab === "overview" || !tab) && (
        <div className="ss-stat-grid">
          <div><strong>{customers.length}</strong><span>Customers</span></div>
          <div><strong>{websites.length}</strong><span>Websites</span></div>
          <div><strong>{websites.filter((w) => w.status === "published").length}</strong><span>Published</span></div>
          <div><strong>{plans.length}</strong><span>Active plans</span></div>
        </div>
      )}

      {tab === "customers" && (
        <div className="ss-table">
          {customers.map((user) => (
            <div key={user.id} className="ss-table-row">
              <div>
                <strong>{user.full_name || "—"}</strong>
                <p className="ss-muted">{user.email} · {user.role} · {user.status}</p>
              </div>
              <button type="button" className="ss-btn" onClick={() => toggleCustomer(user)}>
                {user.status === "active" ? "Suspend" : "Reactivate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "websites" && (
        <div className="ss-table">
          {websites.map((site) => (
            <div key={site.id} className="ss-table-row">
              <div>
                <strong>{site.name}</strong>
                <p className="ss-muted">
                  /s/{site.slug} · {site.status} · {site.ss_profiles?.email || site.owner_id}
                </p>
              </div>
              <button type="button" className="ss-btn" onClick={() => suspendSite(site)} disabled={site.status === "suspended"}>
                Suspend
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "plans" && (
        <div className="ss-admin-plans">
          <div className="ss-table">
            {plans.map((plan) => (
              <div key={plan.id} className="ss-table-row">
                <div>
                  <strong>{plan.name}</strong>
                  <p className="ss-muted">
                    {formatMoney(plan.price_cents, plan.currency)} / {plan.billing_interval} · max {plan.max_websites} sites
                  </p>
                </div>
              </div>
            ))}
          </div>
          <form className="ss-form ss-admin-plan-form" onSubmit={savePlan}>
            <h2>Create / update plan</h2>
            <label>ID<input name="id" required placeholder="starter" /></label>
            <label>Name<input name="name" required /></label>
            <label>Description<input name="description" /></label>
            <label>Price (cents)<input name="price_cents" type="number" min="0" required /></label>
            <label>Setup fee (cents)<input name="setup_fee_cents" type="number" min="0" defaultValue="0" /></label>
            <label>
              Billing
              <select name="billing_interval" defaultValue="monthly">
                <option value="once">once</option>
                <option value="monthly">monthly</option>
                <option value="setup_monthly">setup_monthly</option>
              </select>
            </label>
            <label>Max websites<input name="max_websites" type="number" min="0" defaultValue="1" /></label>
            <label>Max storage MB<input name="max_storage_mb" type="number" min="0" defaultValue="100" /></label>
            <label>Sort<input name="sort_order" type="number" defaultValue="0" /></label>
            <label>Features (comma-separated)<input name="features" placeholder="1 website, Subdomain" /></label>
            <label className="ss-check"><input name="custom_domain" type="checkbox" /> Custom domain</label>
            <button className="ss-btn ss-btn-primary" type="submit">Save plan</button>
          </form>
        </div>
      )}

      {tab === "audit" && (
        <div className="ss-table">
          {audit.map((row) => (
            <div key={row.id} className="ss-table-row">
              <div>
                <strong>{row.action}</strong>
                <p className="ss-muted">
                  {row.entity_type} {row.entity_id} · {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
