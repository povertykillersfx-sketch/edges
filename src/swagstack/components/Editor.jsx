import { useEffect, useRef, useState } from "react";
import {
  getTemplate,
  getWebsite,
  listMedia,
  publishWebsite,
  saveWebsiteDraft,
  uploadMedia,
} from "../lib/api.js";
import { navigateStudio } from "../lib/path.js";
import { SiteRenderer } from "./SiteRenderer.jsx";

const SECTIONS = ["hero", "brand", "about", "services", "menu", "programs", "projects", "cta", "contact", "seo"];

export function Editor({ profile, websiteId }) {
  const [website, setWebsite] = useState(null);
  const [template, setTemplate] = useState(null);
  const [draft, setDraft] = useState({});
  const [device, setDevice] = useState("desktop");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [media, setMedia] = useState([]);
  const saveTimer = useRef(null);
  const fields = template?.schema?.fields || [];

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const site = await getWebsite(websiteId);
        if (!site) throw new Error("Website not found or you do not have access.");
        if (site.owner_id !== profile.id && profile.role !== "super_admin") {
          throw new Error("You can only edit websites you own.");
        }
        const tmpl = await getTemplate(site.template_id);
        if (cancel) return;
        setWebsite(site);
        setTemplate(tmpl);
        setDraft(site.ss_website_configs?.draft || tmpl?.default_config || {});
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
        setSaveState("error");
        setError(err.message || "Autosave failed.");
      }
    }, 700);
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

  return (
    <div className="ss-editor">
      <aside className="ss-editor-panel">
        <div className="ss-editor-top">
          <button type="button" className="ss-linkish" onClick={() => navigateStudio("/studio/dashboard")}>
            ← Dashboard
          </button>
          <h1>{website.name}</h1>
          <p className="ss-muted">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Draft saved"}
            {saveState === "published" && "Published"}
            {saveState === "publishing" && "Publishing…"}
            {saveState === "error" && "Save error"}
            {saveState === "idle" && "Live editor"}
          </p>
        </div>

        {error ? <p className="ss-error">{error}</p> : null}

        {SECTIONS.map((section) => {
          const sectionFields = fields.filter((f) => f.section === section);
          if (!sectionFields.length) return null;
          return (
            <section key={section} className="ss-editor-section">
              <h2>{section}</h2>
              {sectionFields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={draft[field.key]}
                  media={media}
                  onChange={(value) => setField(field.key, value)}
                  onUpload={(file) => onUpload(field.key, file)}
                  onServiceChange={updateService}
                  onServiceAdd={addService}
                  onServiceRemove={removeService}
                />
              ))}
            </section>
          );
        })}

        <div className="ss-editor-actions">
          <button type="button" className="ss-btn ss-btn-primary" onClick={publish}>
            Publish
          </button>
          <a className="ss-btn" href={`/s/${website.slug}`} target="_blank" rel="noreferrer">
            Open /s/{website.slug}
          </a>
        </div>
      </aside>

      <section className="ss-editor-preview">
        <div className="ss-preview-toolbar">
          <button type="button" className={device === "desktop" ? "ss-btn ss-btn-primary" : "ss-btn"} onClick={() => setDevice("desktop")}>
            Desktop
          </button>
          <button type="button" className={device === "mobile" ? "ss-btn ss-btn-primary" : "ss-btn"} onClick={() => setDevice("mobile")}>
            Mobile
          </button>
        </div>
        <div className={`ss-preview-frame ss-preview-frame--${device}`}>
          <SiteRenderer config={draft} templateId={website.template_id} mode={device} />
        </div>
      </section>
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
          <input type="color" value={value || "#22d3ee"} onChange={(e) => onChange(e.target.value)} />
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
