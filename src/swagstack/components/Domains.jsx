import { useEffect, useState } from "react";
import { addCustomDomain, getWebsite, listDomains } from "../lib/api.js";
import { navigateStudio } from "../lib/path.js";

export function DomainsPage({ profile, websiteId }) {
  const [website, setWebsite] = useState(null);
  const [domains, setDomains] = useState([]);
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function reload() {
    const [site, rows] = await Promise.all([getWebsite(websiteId), listDomains(profile.id, websiteId)]);
    setWebsite(site);
    setDomains(rows);
  }

  useEffect(() => {
    reload().catch((err) => setError(err.message || "Could not load domains."));
  }, [websiteId, profile.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    try {
      const row = await addCustomDomain({ ownerId: profile.id, websiteId, hostname });
      setInfo("Custom domain saved as pending. Attach DNS at your registrar, then add the domain in Vercel. Status will stay pending until verified.");
      setHostname("");
      setDomains((current) => [row, ...current]);
    } catch (err) {
      setError(err.message || "Could not add domain.");
    }
  }

  return (
    <div className="ss-page">
      <header className="ss-page-head">
        <div>
          <button type="button" className="ss-linkish" onClick={() => navigateStudio("/studio/dashboard")}>
            ← Dashboard
          </button>
          <h1>Domains</h1>
          <p className="ss-lede">
            Platform path: <code>/s/{website?.slug || "…"}</code>. Custom domains require external DNS + hosting attachment.
          </p>
        </div>
      </header>

      {error ? <p className="ss-error">{error}</p> : null}
      {info ? <p className="ss-info">{info}</p> : null}

      <section className="ss-section">
        <h2>Connected hostnames</h2>
        {!domains.length ? <p className="ss-muted">No domain rows yet.</p> : null}
        {domains.map((domain) => (
          <article key={domain.id} className="ss-domain-row">
            <div>
              <strong>{domain.hostname}</strong>
              <p className="ss-muted">
                {domain.kind} · {domain.status}
              </p>
              {domain.dns_instructions?.records ? (
                <ul className="ss-dns">
                  {domain.dns_instructions.records.map((rec) => (
                    <li key={`${rec.type}-${rec.host}`}>
                      {rec.type} {rec.host} → {rec.value}
                    </li>
                  ))}
                </ul>
              ) : null}
              {domain.dns_instructions?.note ? <p className="ss-muted">{domain.dns_instructions.note}</p> : null}
            </div>
          </article>
        ))}
      </section>

      <form className="ss-form ss-narrow" onSubmit={submit}>
        <h2>Add custom domain</h2>
        <label>
          Hostname
          <input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="www.yourbusiness.co.za" required />
        </label>
        <button className="ss-btn ss-btn-primary" type="submit">
          Save pending domain
        </button>
      </form>
    </div>
  );
}
