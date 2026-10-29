import { useEffect, useState } from "react";
import { createWebsite, listTemplates, listWebsites, unpublishWebsite, publishWebsite } from "../lib/api.js";
import { navigateStudio } from "../lib/path.js";
import { slugify } from "../lib/validation.js";

export function Dashboard({ profile, onRefresh }) {
  const [sites, setSites] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    listWebsites(profile.id)
      .then((rows) => {
        if (!cancel) setSites(rows);
      })
      .catch((err) => {
        if (!cancel) setError(err.message || "Could not load websites. Apply supabase/swagstack_schema.sql if tables are missing.");
      });
    return () => {
      cancel = true;
    };
  }, [profile.id, onRefresh]);

  async function togglePublish(site) {
    setBusy(true);
    setError("");
    try {
      if (site.status === "published") await unpublishWebsite(site.id, profile.id);
      else await publishWebsite(site.id, profile.id);
      const rows = await listWebsites(profile.id);
      setSites(rows);
    } catch (err) {
      setError(err.message || "Publish action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ss-page">
      <header className="ss-page-head">
        <div>
          <p className="ss-eyebrow">Customer dashboard</p>
          <h1>Your websites</h1>
          <p className="ss-lede">Create from a template, customize, preview, and publish.</p>
        </div>
        <button className="ss-btn ss-btn-primary" type="button" onClick={() => navigateStudio("/studio/templates")}>
          New website
        </button>
      </header>

      {error ? <p className="ss-error">{error}</p> : null}

      {!sites.length ? (
        <div className="ss-empty">
          <h2>No websites yet</h2>
          <p>Pick a template to start your first draft.</p>
          <button className="ss-btn ss-btn-primary" type="button" onClick={() => navigateStudio("/studio/templates")}>
            Browse templates
          </button>
        </div>
      ) : (
        <div className="ss-site-list">
          {sites.map((site) => (
            <article key={site.id} className="ss-site-row">
              <div>
                <h2>{site.name}</h2>
                <p>
                  <span className={`ss-pill ss-pill-${site.status}`}>{site.status}</span>
                  <span className="ss-muted"> /s/{site.slug}</span>
                </p>
              </div>
              <div className="ss-row-actions">
                <button type="button" className="ss-btn" onClick={() => navigateStudio(`/studio/sites/${site.id}/edit`)}>
                  Customize
                </button>
                <button
                  type="button"
                  className="ss-btn"
                  onClick={() =>
                    window.open(
                      `${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/s/${site.slug}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Preview live
                </button>
                <button type="button" className="ss-btn" disabled={busy} onClick={() => togglePublish(site)}>
                  {site.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <button type="button" className="ss-btn" onClick={() => navigateStudio(`/studio/sites/${site.id}/domains`)}>
                  Domains
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplateLibrary({ profile }) {
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState("");

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err.message || "Could not load templates."));
  }, []);

  async function startFrom(template) {
    setCreating(template.id);
    setError("");
    try {
      const name = `${template.name} site`;
      const site = await createWebsite({
        ownerId: profile.id,
        templateId: template.id,
        name,
        slug: slugify(`${profile.full_name || "site"}-${template.id}-${Date.now().toString(36)}`),
      });
      navigateStudio(`/studio/sites/${site.id}/edit`);
    } catch (err) {
      setError(err.message || "Could not create website. Confirm schema + auth are applied.");
    } finally {
      setCreating("");
    }
  }

  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <div className="ss-page">
      <header className="ss-page-head">
        <div>
          <p className="ss-eyebrow">Template library</p>
          <h1>Choose a template</h1>
          <p className="ss-lede">Controlled fields only — layouts stay locked so customers cannot break the design.</p>
        </div>
      </header>
      {error ? <p className="ss-error">{error}</p> : null}
      {categories.map((category) => (
        <section key={category} className="ss-template-cat">
          <h2>{category}</h2>
          <div className="ss-template-grid">
            {templates
              .filter((t) => t.category === category)
              .map((template) => (
                <article key={template.id} className="ss-template-card">
                  <div className="ss-template-preview" style={{ backgroundImage: `url(${template.preview_image})` }} />
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <p className="ss-muted">Plan: {template.min_plan_id}</p>
                  <button
                    type="button"
                    className="ss-btn ss-btn-primary"
                    disabled={creating === template.id}
                    onClick={() => startFrom(template)}
                  >
                    {creating === template.id ? "Creating…" : "Use template"}
                  </button>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
