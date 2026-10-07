import { useEffect, useRef, useState } from "react";
import { LICENSE_TERMS, PLANS, SYMBOLS } from "./data.js";
import { IdentityForm } from "./IdentityForm.jsx";

const VIEWS = {
  dashboard: "Dashboard",
  license: "Generate license key",
  profile: "Create EA profile",
  settings: "Settings",
  subscriptions: "Subscriptions",
  mentors: "Approve mentors",
};

function makeKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
  return `EDGX-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

function planName(id) {
  return PLANS.find((plan) => plan.id === id)?.name ?? id;
}

export function Portal({ portal, onChange, onClose, onLogout }) {
  const [view, setView] = useState("dashboard");
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [view]);

  function patch(next) {
    onChange({ ...portal, ...next });
  }

  return (
    <section className="portal" ref={scroller} aria-labelledby="portal-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Portal</p>
          <h2 id="portal-title">{VIEWS[view]}</h2>
        </div>
        {view === "dashboard" ? (
          <button type="button" className="text-btn" onClick={onClose}>
            Close
          </button>
        ) : (
          <button type="button" className="text-btn" onClick={() => setView("dashboard")}>
            Back
          </button>
        )}
      </header>

      {view === "dashboard" && <Dashboard portal={portal} onOpen={setView} onLogout={onLogout} />}
      {view === "license" && <LicenseKeys portal={portal} onPatch={patch} />}
      {view === "profile" && <EaProfiles portal={portal} onPatch={patch} />}
      {view === "settings" && <PortalSettings portal={portal} onPatch={patch} />}
      {view === "subscriptions" && <Subscriptions portal={portal} onPatch={patch} />}
      {view === "mentors" && <Mentors portal={portal} onPatch={patch} />}
    </section>
  );
}

function Dashboard({ portal, onOpen, onLogout }) {
  const active = portal.keys.filter((item) => item.status === "active").length;
  const revoked = portal.keys.filter((item) => item.status === "revoked").length;
  const mentors = portal.mentors.filter((item) => item.status === "approved").length;
  const pending = portal.mentors.filter((item) => item.status === "pending").length;
  const subscriptions = portal.subscriptions.filter((item) => item.status === "active").length;
  const waiting = portal.subscriptions.filter((item) => item.status === "pending").length;
  const items = [
    ["license", "Generate license key", `${active} active · ${revoked} revoked`],
    ["profile", "Create EA profile", `${portal.profiles.length} saved`],
    ["settings", "Settings", "Name, mentor, and EA picture"],
    ["subscriptions", "Subscriptions", waiting ? `${waiting} waiting` : `${subscriptions} active`],
    ["mentors", "Approve mentors", pending ? `${pending} pending` : "None pending"],
  ];

  return (
    <>
      <dl className="portal-stats">
        <div>
          <dt>Active keys</dt>
          <dd>{active}</dd>
        </div>
        <div>
          <dt>Revoked keys</dt>
          <dd>{revoked}</dd>
        </div>
        <div>
          <dt>Total mentors</dt>
          <dd>{mentors}</dd>
        </div>
        <div>
          <dt>Pending approval</dt>
          <dd>{pending}</dd>
        </div>
      </dl>
      <div className="portal-menu">
        {items.map(([id, title, copy]) => (
          <button key={id} type="button" className="setting-link" onClick={() => onOpen(id)}>
            <span>
              <p className="setting-title">{title}</p>
              <p className="setting-copy">{copy}</p>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      <button type="button" className="connect-btn ghost portal-logout" onClick={onLogout}>
        Log out
      </button>
    </>
  );
}

function termLabel(id) {
  return LICENSE_TERMS.find((term) => term.id === id)?.label ?? id;
}

function LicenseKeys({ portal, onPatch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [term, setTerm] = useState("30d");
  const [profileId, setProfileId] = useState("");
  const [error, setError] = useState("");

  function generate(event) {
    event.preventDefault();
    const holder = name.trim();
    const address = email.trim();
    const profile = portal.profiles.find((item) => item.id === profileId);
    if (!holder || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a name and a valid email address.");
      return;
    }
    if (!profile) {
      setError("Select an EA you created.");
      return;
    }
    const key = {
      id: crypto.randomUUID(),
      code: makeKey(),
      label: holder,
      name: holder,
      email: address,
      term,
      status: "active",
      at: Date.now(),
      eaName: profile.name,
      profileId: profile.id,
      picture: profile.picture || "",
    };
    onPatch({ keys: [key, ...portal.keys] });
    setName("");
    setEmail("");
    setError("");
  }

  return (
    <>
      <form className="portal-form" onSubmit={generate}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder="Email address"
          />
        </label>
        <label>
          EA
          <select
            value={profileId}
            onChange={(event) => {
              setProfileId(event.target.value);
              setError("");
            }}
          >
            <option value="">Choose an EA</option>
            {portal.profiles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {portal.profiles.length === 0 && (
          <p className="setting-copy">Create an EA profile first, then select it here.</p>
        )}
        <p className="portal-label">How long it lasts</p>
        <div className="choice-row">
          {LICENSE_TERMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={term === item.id ? "choice on" : "choice"}
              aria-pressed={term === item.id}
              onClick={() => {
                setTerm(item.id);
                setError("");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="connect-btn">
          Generate key
        </button>
      </form>
      {portal.keys.length === 0 ? (
        <p className="setting-copy">No license keys yet.</p>
      ) : (
        <ul className="portal-rows">
          {portal.keys.map((item) => (
            <li key={item.id}>
              <div>
                <p className="license-code">{item.code}</p>
                <p className="setting-copy">
                  {item.status === "active" ? "Active" : "Revoked"}
                  {item.name ? ` · ${item.name}` : ""}
                  {item.email ? ` · ${item.email}` : ""}
                  {` · ${termLabel(item.term)}`}
                  {item.eaName ? ` · ${item.eaName}` : ""}
                </p>
              </div>
              {item.status === "active" && (
                <button
                  type="button"
                  className="text-btn"
                  onClick={() =>
                    onPatch({
                      keys: portal.keys.map((key) =>
                        key.id === item.id ? { ...key, status: "revoked" } : key
                      ),
                    })
                  }
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function EaProfiles({ portal, onPatch }) {
  const [name, setName] = useState("");
  const [mentorName, setMentorName] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [error, setError] = useState("");

  function toggleSymbol(id) {
    setError("");
    setSymbols((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function create(event) {
    event.preventDefault();
    const eaName = name.trim();
    const mentor = mentorName.trim();
    if (!eaName || !mentor) {
      setError("Enter the EA name and the mentor name.");
      return;
    }
    if (symbols.length === 0) {
      setError("Select at least one symbol.");
      return;
    }
    onPatch({
      profiles: [
        {
          id: crypto.randomUUID(),
          name: eaName,
          mentorName: mentor,
          symbols,
          at: Date.now(),
        },
        ...portal.profiles,
      ],
    });
    setName("");
    setMentorName("");
    setSymbols([]);
    setError("");
  }

  return (
    <>
      <form className="portal-form" onSubmit={create}>
        <label>
          EA name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="EA name"
          />
        </label>
        <label>
          Mentor name
          <input
            value={mentorName}
            onChange={(event) => {
              setMentorName(event.target.value);
              setError("");
            }}
            placeholder="Mentor name"
          />
        </label>
        <p className="portal-label">Symbols</p>
        <div className="choice-row">
          {SYMBOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={symbols.includes(item.id) ? "choice on" : "choice"}
              aria-pressed={symbols.includes(item.id)}
              onClick={() => toggleSymbol(item.id)}
            >
              {item.id}
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="connect-btn">
          Create profile
        </button>
      </form>
      {portal.profiles.length === 0 ? (
        <p className="setting-copy">No EA profiles yet.</p>
      ) : (
        <ul className="portal-rows">
          {portal.profiles.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.name}</p>
                <p className="setting-copy">
                  {item.mentorName ? `${item.mentorName} · ` : ""}
                  {item.symbols.join(", ")}
                </p>
              </div>
              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  onPatch({ profiles: portal.profiles.filter((profile) => profile.id !== item.id) })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PortalSettings({ portal, onPatch }) {
  function update(next) {
    onPatch({ settings: { ...portal.settings, ...next } });
  }

  return (
    <>
      <IdentityForm portal={portal} onChange={onPatch} />
      <ul className="settings-list">
        <li>
          <div>
            <p className="setting-title">Auto-approve mentors</p>
            <p className="setting-copy">New requests skip the waiting list.</p>
          </div>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={portal.settings.autoApprove}
            onClick={() => update({ autoApprove: !portal.settings.autoApprove })}
          >
            <i />
            <span className="sr-only">Auto-approve mentors</span>
          </button>
        </li>
      </ul>
    </>
  );
}

function Subscriptions({ portal, onPatch }) {
  const pending = portal.subscriptions.filter((item) => item.status === "pending");
  const approved = portal.subscriptions.filter(
    (item) => item.status === "approved" || item.status === "active"
  );
  const declined = portal.subscriptions.filter((item) => item.status === "declined");

  function setStatus(id, status) {
    onPatch({
      subscriptions: portal.subscriptions.map((item) => (item.id === id ? { ...item, status } : item)),
    });
  }

  return (
    <>
      <p className="setting-copy">
        Signups from the first page wait here. Approve one before that person can enter a license key.
      </p>
      <p className="portal-label">Waiting</p>
      {pending.length === 0 ? (
        <p className="setting-copy">No signups waiting for approval.</p>
      ) : (
        <ul className="portal-rows">
          {pending.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.holder}</p>
                <p className="setting-copy">{item.email}</p>
              </div>
              <div className="row-actions">
                <button type="button" className="text-btn" onClick={() => setStatus(item.id, "approved")}>
                  Approve
                </button>
                <button type="button" className="text-btn" onClick={() => setStatus(item.id, "declined")}>
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="portal-label">Approved</p>
      {approved.length === 0 ? (
        <p className="setting-copy">No approved signups.</p>
      ) : (
        <ul className="portal-rows">
          {approved.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.holder}</p>
                <p className="setting-copy">
                  {item.email}
                  {item.status === "active" ? " · Licensed" : " · Can enter a license key"}
                  {item.plan ? ` · ${planName(item.plan)}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {declined.length > 0 && (
        <>
          <p className="portal-label">Declined</p>
          <ul className="portal-rows">
            {declined.map((item) => (
              <li key={item.id}>
                <div>
                  <p className="setting-title">{item.holder}</p>
                  <p className="setting-copy">{item.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Mentors({ portal, onPatch }) {
  const pending = portal.mentors.filter((item) => item.status === "pending");
  const approved = portal.mentors.filter((item) => item.status === "approved");
  const declined = portal.mentors.filter((item) => item.status === "declined");

  function setStatus(id, status) {
    onPatch({
      mentors: portal.mentors.map((item) => (item.id === id ? { ...item, status } : item)),
    });
  }

  return (
    <>
      <p className="setting-copy">
        Mentor signups from the first page wait here. Approve one to add that mentor.
      </p>
      <p className="portal-label">Waiting</p>
      {pending.length === 0 ? (
        <p className="setting-copy">No mentor signups waiting for approval.</p>
      ) : (
        <ul className="portal-rows">
          {pending.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.name}</p>
                <p className="setting-copy">
                  {item.email ? `${item.email} · ` : ""}
                  {item.market}
                </p>
              </div>
              <div className="row-actions">
                <button type="button" className="text-btn" onClick={() => setStatus(item.id, "approved")}>
                  Approve
                </button>
                <button type="button" className="text-btn" onClick={() => setStatus(item.id, "declined")}>
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="portal-label">Approved</p>
      {approved.length === 0 ? (
        <p className="setting-copy">No approved mentors.</p>
      ) : (
        <ul className="portal-rows">
          {approved.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.name}</p>
                <p className="setting-copy">
                  {item.email ? `${item.email} · ` : ""}
                  {item.market}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {declined.length > 0 && (
        <>
          <p className="portal-label">Declined</p>
          <ul className="portal-rows">
            {declined.map((item) => (
              <li key={item.id}>
                <div>
                  <p className="setting-title">{item.name}</p>
                  <p className="setting-copy">
                    {item.email ? `${item.email} · ` : ""}
                    {item.market}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
