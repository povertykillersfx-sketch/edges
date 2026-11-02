import { useEffect, useRef, useState } from "react";
import {
  getTemplate,
  getWebsite,
  listMedia,
  publishWebsite,
  saveWebsiteDraft,
  uploadMedia,
} from "../lib/api.js";
import { navigateStudio, withBase } from "../lib/path.js";
import { DEMO_SITE_ID, aeonDefaultConfig, shouldResetAeonDraft } from "../lib/aeonDefaults.js";
import { upsertLocalSite, getLocalSite, BOOTSTRAP_USER_ID } from "../lib/bootstrap.js";
import { SiteRenderer } from "./SiteRenderer.jsx";

const WIDTHS = { desktop: 1440, tablet: 834, mobile: 390 };

const LEFT_ELEMENTS = [
  { group: "Recently Used", items: ["Text", "Heading", "Button", "Image"] },
  { group: "Structure", items: ["Section", "Container", "Stack", "1-Col", "2-Col", "Grid"] },
  { group: "Media", items: ["Image", "Video", "Embed"] },
];

const FIELD_META = {
  businessName: { label: "Business name", tag: "Brand", type: "text" },
  headline: { label: "Headline", tag: "H1", type: "text", fontSize: 48, weight: "Medium", pad: 40 },
  tagline: { label: "Tagline", tag: "P", type: "textarea", fontSize: 18, weight: "Regular", pad: 8 },
  about: { label: "About", tag: "P", type: "textarea", fontSize: 16, weight: "Regular", pad: 16 },
  ctaText: { label: "Button text", tag: "CTA", type: "text", fontSize: 14, weight: "Medium", pad: 0 },
  ctaUrl: { label: "Button URL", tag: "Link", type: "text" },
  primaryColor: { label: "Primary color", tag: "Color", type: "color" },
  accentColor: { label: "Accent color", tag: "Color", type: "color" },
  fontFamily: { label: "Font", tag: "Type", type: "text" },
  services: { label: "Services", tag: "Cards", type: "services" },
  phone: { label: "Phone", tag: "Contact", type: "text" },
  email: { label: "Email", tag: "Contact", type: "text" },
  logo: { label: "Logo", tag: "Image", type: "image" },
  heroImage: { label: "Hero image", tag: "Image", type: "image" },
  seoTitle: { label: "SEO title", tag: "SEO", type: "text" },
  seoDescription: { label: "SEO description", tag: "SEO", type: "textarea" },
};

export function Editor({ profile, websiteId }) {
  const [website, setWebsite] = useState(null);
  const [template, setTemplate] = useState(null);
  const [draft, setDraft] = useState({});
  const [device, setDevice] = useState("desktop");
  const [selectedKey, setSelectedKey] = useState("headline");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [media, setMedia] = useState([]);
  const [leftTab, setLeftTab] = useState("elements");
  const saveTimer = useRef(null);
  const fields = template?.schema?.fields || [];

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        let site = await getWebsite(websiteId);
        const tmpl = site ? await getTemplate(site.template_id) : await getTemplate("agency-signal");
        const defaults = aeonDefaultConfig(tmpl?.default_config?.businessName || "Signal Labs");

        // Reset demo site / stale drafts that spoil Aeon look
        if (websiteId === DEMO_SITE_ID || (site && shouldResetAeonDraft(site.ss_website_configs?.draft))) {
          const brand = site?.ss_website_configs?.draft?.businessName || defaults.businessName;
          const keptViewport =
            site?.preferred_viewport ||
            site?.device_mode ||
            site?.ss_website_configs?.draft?.preferred_viewport ||
            site?.ss_website_configs?.draft?.device_mode;
          const nextDraft = {
            ...defaults,
            businessName: brand,
            headline: `Halo ${brand}.`,
            ...(keptViewport === "mobile" || keptViewport === "desktop"
              ? { preferred_viewport: keptViewport }
              : {}),
          };
          if (!site) {
            site = {
              id: websiteId,
              owner_id: profile.id || BOOTSTRAP_USER_ID,
              template_id: "agency-signal",
              template_version: 1,
              name: `${brand} site`,
              slug: "signal-labs-demo",
              status: "draft",
              preferred_viewport: "desktop",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ss_website_configs: { draft: nextDraft, published: {}, updated_at: new Date().toISOString() },
            };
            upsertLocalSite(site);
          } else {
            site = {
              ...site,
              preferred_viewport: keptViewport === "mobile" ? "mobile" : site.preferred_viewport || "desktop",
              ss_website_configs: {
                ...(site.ss_website_configs || {}),
                draft: nextDraft,
                updated_at: new Date().toISOString(),
              },
            };
            if (getLocalSite(site.id) || websiteId === DEMO_SITE_ID) upsertLocalSite(site);
            try {
              await saveWebsiteDraft(site.id, nextDraft, tmpl?.schema?.fields || []);
            } catch {
              upsertLocalSite(site);
            }
          }
        }

        if (!site) throw new Error("Website not found or you do not have access.");
        if (site.owner_id !== profile.id && profile.role !== "super_admin") {
          throw new Error("You can only edit websites you own.");
        }
        if (cancel) return;
        setWebsite(site);
        setTemplate(tmpl);
        const nextDraft = site.ss_website_configs?.draft || tmpl?.default_config || defaults;
        setDraft(nextDraft);
        const preferred =
          site.preferred_viewport ||
          site.device_mode ||
          nextDraft?.preferred_viewport ||
          nextDraft?.device_mode;
        setDevice(preferred === "mobile" ? "mobile" : "desktop");
        const assets = await listMedia(profile.id, websiteId).catch(() => []);
        if (!cancel) setMedia(assets);
      } catch (err) {
        if (!cancel) setError(err.message || "Could not open editor.");
      }
    })();
    return () => {
      cancel = true;
      clearTimeout(saveTimer.current);
    };
  }, [websiteId, profile.id, profile.role]);

  function queueSave(nextDraft) {
    setDraft(nextDraft);
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveWebsiteDraft(websiteId, nextDraft, fields);
        setSaveState("saved");
      } catch (err) {
        // Keep local bootstrap sites editable even if remote schema is missing.
        const local = getLocalSite(websiteId);
        if (local) {
          upsertLocalSite({
            ...local,
            updated_at: new Date().toISOString(),
            ss_website_configs: {
              ...(local.ss_website_configs || {}),
              draft: nextDraft,
              updated_at: new Date().toISOString(),
            },
          });
          setSaveState("saved");
          return;
        }
        setSaveState("error");
        setError(err.message || "Autosave failed.");
      }
    }, 500);
  }

  function setField(key, value) {
    queueSave({ ...draft, [key]: value });
  }

  function updateService(index, key, value) {
    const services = [...(draft.services || [])];
    services[index] = { ...services[index], [key]: value };
    setField("services", services);
  }

  function addService() {
    setField("services", [...(draft.services || []), { name: "New item", price: "", description: "" }]);
  }

  function removeService(index) {
    setField(
      "services",
      (draft.services || []).filter((_, i) => i !== index)
    );
  }

  async function onUpload(fieldKey, file) {
    setError("");
    try {
      const asset = await uploadMedia({ ownerId: profile.id, websiteId, file });
      setMedia((current) => [asset, ...current]);
      setField(fieldKey, asset.public_url);
    } catch (err) {
      setError(err.message || "Upload failed.");
    }
  }

  async function publish() {
    setError("");
    setSaveState("publishing");
    try {
      await saveWebsiteDraft(websiteId, draft, fields);
      await publishWebsite(websiteId, profile.id);
      setSaveState("published");
      const site = await getWebsite(websiteId);
      setWebsite(site);
    } catch (err) {
      const local = getLocalSite(websiteId);
      if (local) {
        upsertLocalSite({
          ...local,
          status: "published",
          published_at: new Date().toISOString(),
          ss_website_configs: {
            ...(local.ss_website_configs || {}),
            draft,
            published: draft,
          },
        });
        setSaveState("published");
        return;
      }
      setSaveState("error");
      setError(err.message || "Publish failed.");
    }
  }

  if (error && !website) {
    return (
      <div className="ss-page">
        <p className="ss-error">{error}</p>
        <button type="button" className="ss-btn" onClick={() => navigateStudio("/studio/dashboard")}>
          Back
        </button>
      </div>
    );
  }

  if (!website || !template) {
    return <div className="ss-page"><p className="ss-muted">Loading editor…</p></div>;
  }

  const meta = FIELD_META[selectedKey] || { label: selectedKey, tag: "Field", type: "text", fontSize: 16, weight: "Regular", pad: 16 };
  const selectedField = fields.find((f) => f.key === selectedKey);

  return (
    <div className="ss-builder">
      <header className="ss-builder-top">
        <div className="ss-builder-top-left">
          <button type="button" className="ss-builder-home" onClick={() => navigateStudio("/studio/dashboard")}>
            ←
          </button>
          <strong>{website.name}</strong>
          <span className="ss-builder-status">
            {saveState === "saving" && "Saving"}
            {saveState === "saved" && "Saved"}
            {saveState === "published" && "Published"}
            {saveState === "publishing" && "Publishing"}
            {saveState === "error" && "Error"}
            {saveState === "idle" && "Draft"}
          </span>
        </div>
        <div className="ss-builder-devices">
          {["desktop", "tablet", "mobile"].map((name) => (
            <button
              key={name}
              type="button"
              className={device === name ? "is-active" : ""}
              onClick={() => setDevice(name)}
              title={name}
            >
              {name === "desktop" ? "🖥" : name === "tablet" ? "▦" : "▮"}
            </button>
          ))}
          <span className="ss-builder-width">{WIDTHS[device]} px</span>
        </div>
        <div className="ss-builder-top-right">
          <a className="ss-btn" href={withBase(`/s/${website.slug}`)} target="_blank" rel="noreferrer">
            Preview
          </a>
          <button type="button" className="ss-btn ss-btn-primary" onClick={publish}>
            Publish
          </button>
        </div>
      </header>

      <div className="ss-builder-body">
        <aside className="ss-builder-left">
          <div className="ss-builder-left-tabs">
            <button type="button" className={leftTab === "elements" ? "is-active" : ""} onClick={() => setLeftTab("elements")}>
              Elements
            </button>
            <button type="button" className={leftTab === "fields" ? "is-active" : ""} onClick={() => setLeftTab("fields")}>
              Fields
            </button>
          </div>

          {leftTab === "elements" ? (
            <div className="ss-builder-left-scroll">
              <p className="ss-builder-hint">Structure palette (preview). Editing stays field-based.</p>
              {LEFT_ELEMENTS.map((group) => (
                <div key={group.group} className="ss-builder-group">
                  <h3>{group.group}</h3>
                  <div className="ss-builder-tiles">
                    {group.items.map((item) => (
                      <div key={item} className="ss-builder-tile" title="Decorative — use Fields tab">
                        <span />
                        <em>{item}</em>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ss-builder-left-scroll">
              {fields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  className={`ss-builder-field-item ${selectedKey === field.key ? "is-active" : ""}`}
                  onClick={() => setSelectedKey(field.key)}
                >
                  <strong>{field.label}</strong>
                  <span>{field.section}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="ss-builder-canvas">
          {error ? <p className="ss-error ss-builder-error">{error}</p> : null}
          <div className={`ss-preview-frame ss-preview-frame--${device}`} style={{ width: Math.min(WIDTHS[device], 1440) }}>
            <SiteRenderer
              config={draft}
              templateId={website.template_id}
              mode={device === "tablet" ? "desktop" : device}
              selectedKey={selectedKey}
              onSelectField={setSelectedKey}
            />
          </div>
        </section>

        <aside className="ss-builder-right">
          <div className="ss-builder-right-head">
            <h2>{meta.label}</h2>
            <div className="ss-builder-pills">
              <span className="ss-pill-blue">Field</span>
              <span className="ss-pill-orange">Tag: {meta.tag}</span>
            </div>
          </div>

          <div className="ss-builder-prop">
            <h3>Typography</h3>
            <label>
              Font
              <input value={draft.fontFamily || "Plus Jakarta Sans"} onChange={(e) => setField("fontFamily", e.target.value)} />
            </label>
            <div className="ss-builder-prop-row">
              <label>
                Weight
                <input value={meta.weight || "Medium"} readOnly />
              </label>
              <label>
                Size
                <input value={meta.fontSize || 16} readOnly />
              </label>
            </div>
          </div>

          <div className="ss-builder-prop">
            <h3>Spacing</h3>
            <div className="ss-box-model">
              <span>margin</span>
              <div className="ss-box-pad">
                <em>{meta.pad ?? 16}</em>
                <div className="ss-box-core">padding</div>
              </div>
            </div>
          </div>

          <div className="ss-builder-prop">
            <h3>Content</h3>
            {selectedField ? (
              <FieldControl
                field={selectedField}
                value={draft[selectedKey]}
                onChange={(value) => setField(selectedKey, value)}
                onUpload={(file) => onUpload(selectedKey, file)}
                onServiceChange={updateService}
                onServiceAdd={addService}
                onServiceRemove={removeService}
              />
            ) : (
              <p className="ss-muted">Select a canvas field.</p>
            )}
          </div>

          <div className="ss-builder-prop">
            <h3>Brand colors</h3>
            <label className="ss-field ss-field-color">
              Primary
              <span>
                <input type="color" value={draft.primaryColor || "#0b0b0b"} onChange={(e) => setField("primaryColor", e.target.value)} />
                <input value={draft.primaryColor || "#0b0b0b"} onChange={(e) => setField("primaryColor", e.target.value)} />
              </span>
            </label>
            <label className="ss-field ss-field-color">
              Accent
              <span>
                <input type="color" value={draft.accentColor || "#8b5cf6"} onChange={(e) => setField("accentColor", e.target.value)} />
                <input value={draft.accentColor || "#8b5cf6"} onChange={(e) => setField("accentColor", e.target.value)} />
              </span>
            </label>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FieldControl({ field, value, onChange, onUpload, onServiceChange, onServiceAdd, onServiceRemove }) {
  if (field.type === "textarea") {
    return (
      <label className="ss-field">
        {field.label}
        <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={4} />
      </label>
    );
  }
  if (field.type === "color") {
    return (
      <label className="ss-field ss-field-color">
        {field.label}
        <span>
          <input type="color" value={value || "#8b5cf6"} onChange={(e) => onChange(e.target.value)} />
          <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
        </span>
      </label>
    );
  }
  if (field.type === "image") {
    return (
      <label className="ss-field">
        {field.label}
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Image URL" />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
        {value ? <img src={value} alt="" className="ss-thumb" /> : null}
      </label>
    );
  }
  if (field.type === "services") {
    const items = Array.isArray(value) ? value : [];
    return (
      <div className="ss-field">
        <div className="ss-field-row">
          <span>{field.label}</span>
          <button type="button" className="ss-btn" onClick={onServiceAdd}>
            Add
          </button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="ss-service-edit">
            <input value={item.name || ""} placeholder="Name" onChange={(e) => onServiceChange(index, "name", e.target.value)} />
            <input value={item.price || ""} placeholder="Price" onChange={(e) => onServiceChange(index, "price", e.target.value)} />
            <textarea value={item.description || ""} placeholder="Description" rows={2} onChange={(e) => onServiceChange(index, "description", e.target.value)} />
            <button type="button" className="ss-linkish" onClick={() => onServiceRemove(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    );
  }
  return (
    <label className="ss-field">
      {field.label}
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
