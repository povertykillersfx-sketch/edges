import { useEffect, useRef, useState } from "react";
import { MENTOR_MARKETS, PLANS, SYMBOLS } from "./data.js";

const VOLUMES = [0.01, 0.1, 0.5, 1];
const TERMS = [30, 90, 365];
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

export function Portal({ portal, onChange, onClose }) {
  const [view, setView] = useState("dashboard");
  const scroller = useRef(null);
  const activeKeys = portal.keys.filter((item) => item.status === "active");
  const waiting = portal.mentors.filter((item) => item.status === "pending");
  const activeSubs = portal.subscriptions.filter((item) => item.status === "active");

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

      {view === "dashboard" && (
        <Dashboard
          keys={activeKeys.length}
          profiles={portal.profiles.length}
          subscriptions={activeSubs.length}
          waiting={waiting.length}
          onOpen={setView}
        />
      )}
      {view === "license" && <LicenseKeys portal={portal} onPatch={patch} />}
      {view === "profile" && <EaProfiles portal={portal} onPatch={patch} />}
      {view === "settings" && <PortalSettings portal={portal} onPatch={patch} />}
      {view === "subscriptions" && <Subscriptions portal={portal} onPatch={patch} />}
      {view === "mentors" && <Mentors portal={portal} onPatch={patch} />}
    </section>
  );
}

function Dashboard({ keys, profiles, subscriptions, waiting, onOpen }) {
  const items = [
    ["license", "Generate license key", `${keys} active`],
    ["profile", "Create EA profile", `${profiles} saved`],
    ["settings", "Settings", "Volume, term, mentor review"],
    ["subscriptions", "Subscriptions", `${subscriptions} active`],
    ["mentors", "Approve mentors", waiting ? `${waiting} waiting` : "None waiting"],
  ];

  return (
    <>
      <dl className="portal-stats">
        <div>
          <dt>Keys</dt>
          <dd>{keys}</dd>
        </div>
        <div>
          <dt>Profiles</dt>
          <dd>{profiles}</dd>
        </div>
        <div>
          <dt>Subscriptions</dt>
          <dd>{subscriptions}</dd>
        </div>
        <div>
          <dt>Waiting</dt>
          <dd>{waiting}</dd>
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
    </>
  );
}

function LicenseKeys({ portal, onPatch }) {
  const [label, setLabel] = useState("");

  function generate() {
    const key = {
      id: crypto.randomUUID(),
      code: makeKey(),
      label: label.trim(),
      status: "active",
      at: Date.now(),
    };
    onPatch({ keys: [key, ...portal.keys] });
    setLabel("");
  }

  return (
    <>
      <form
        className="portal-form"
        onSubmit={(event) => {
          event.preventDefault();
          generate();
        }}
      >
        <label>
          Label
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Optional note"
          />
        </label>
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
                  {item.label ? ` · ${item.label}` : ""}
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
  const [symbol, setSymbol] = useState(SYMBOLS[0].id);
  const [volume, setVolume] = useState(portal.settings.volume);
  const [error, setError] = useState("");

  function create(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Name the EA profile.");
      return;
    }
    onPatch({
      profiles: [
        { id: crypto.randomUUID(), name: trimmed, symbol, volume, at: Date.now() },
        ...portal.profiles,
      ],
    });
    setName("");
    setError("");
  }

  return (
    <>
      <form className="portal-form" onSubmit={create}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="London open" />
        </label>
        <label>
          Symbol
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
            {SYMBOLS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </select>
        </label>
        <p className="portal-label">Volume</p>
        <div className="choice-row">
          {VOLUMES.map((value) => (
            <button
              key={value}
              type="button"
              className={volume === value ? "choice on" : "choice"}
              onClick={() => setVolume(value)}
            >
              {value.toFixed(2)}
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
                  {item.symbol} · {item.volume.toFixed(2)}
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
      <p className="portal-label">Default volume</p>
      <div className="choice-row">
        {VOLUMES.map((value) => (
          <button
            key={value}
            type="button"
            className={portal.settings.volume === value ? "choice on" : "choice"}
            onClick={() => update({ volume: value })}
          >
            {value.toFixed(2)}
          </button>
        ))}
      </div>
      <p className="portal-label">Subscription term</p>
      <div className="choice-row">
        {TERMS.map((days) => (
          <button
            key={days}
            type="button"
            className={portal.settings.days === days ? "choice on" : "choice"}
            onClick={() => update({ days })}
          >
            {days} days
          </button>
        ))}
      </div>
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
  const activeKeys = portal.keys.filter((item) => item.status === "active");
  const [holder, setHolder] = useState("");
  const [plan, setPlan] = useState(PLANS[0].id);
  const [keyId, setKeyId] = useState(activeKeys[0]?.id ?? "");
  const [error, setError] = useState("");

  function start(event) {
    event.preventDefault();
    const name = holder.trim();
    if (name.length < 2) {
      setError("Name the subscription holder.");
      return;
    }
    if (!activeKeys.some((item) => item.id === keyId)) {
      setError("Generate an active license key first.");
      return;
    }
    onPatch({
      subscriptions: [
        {
          id: crypto.randomUUID(),
          holder: name,
          plan,
          keyId,
          days: portal.settings.days,
          status: "active",
          at: Date.now(),
        },
        ...portal.subscriptions,
      ],
    });
    setHolder("");
    setError("");
  }

  return (
    <>
      <form className="portal-form" onSubmit={start}>
        <p className="portal-label">Plan</p>
        <div className="choice-row">
          {PLANS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={plan === item.id ? "choice on" : "choice"}
              onClick={() => setPlan(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <label>
          Holder
          <input
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
            placeholder="Desk name"
          />
        </label>
        <label>
          License
          <select value={keyId} onChange={(event) => setKeyId(event.target.value)}>
            {activeKeys.length === 0 && <option value="">No active key</option>}
            {activeKeys.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code}
              </option>
            ))}
          </select>
        </label>
        <p className="setting-copy">Term is {portal.settings.days} days, from portal settings.</p>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="connect-btn" disabled={activeKeys.length === 0}>
          Start subscription
        </button>
      </form>
      {portal.subscriptions.length === 0 ? (
        <p className="setting-copy">No subscriptions yet.</p>
      ) : (
        <ul className="portal-rows">
          {portal.subscriptions.map((item) => {
            const key = portal.keys.find((entry) => entry.id === item.keyId);
            return (
              <li key={item.id}>
                <div>
                  <p className="setting-title">
                    {planName(item.plan)} · {item.holder}
                  </p>
                  <p className="setting-copy">
                    {item.status === "active" ? `${item.days} days` : "Ended"}
                    {key ? ` · ${key.code}` : ""}
                  </p>
                </div>
                {item.status === "active" && (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      onPatch({
                        subscriptions: portal.subscriptions.map((entry) =>
                          entry.id === item.id ? { ...entry, status: "ended" } : entry
                        ),
                      })
                    }
                  >
                    End
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Mentors({ portal, onPatch }) {
  const [name, setName] = useState("");
  const [market, setMarket] = useState(MENTOR_MARKETS[0]);
  const [error, setError] = useState("");
  const pending = portal.mentors.filter((item) => item.status === "pending");
  const approved = portal.mentors.filter((item) => item.status === "approved");

  function add(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Name the mentor request.");
      return;
    }
    onPatch({
      mentors: [
        {
          id: crypto.randomUUID(),
          name: trimmed,
          market,
          status: portal.settings.autoApprove ? "approved" : "pending",
          at: Date.now(),
        },
        ...portal.mentors,
      ],
    });
    setName("");
    setError("");
  }

  function setStatus(id, status) {
    onPatch({
      mentors: portal.mentors.map((item) => (item.id === id ? { ...item, status } : item)),
    });
  }

  return (
    <>
      <form className="portal-form" onSubmit={add}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Mentor name" />
        </label>
        <label>
          Market
          <select value={market} onChange={(event) => setMarket(event.target.value)}>
            {MENTOR_MARKETS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="connect-btn">
          Add request
        </button>
      </form>

      <p className="portal-label">Waiting</p>
      {pending.length === 0 ? (
        <p className="setting-copy">No mentors waiting for approval.</p>
      ) : (
        <ul className="portal-rows">
          {pending.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.name}</p>
                <p className="setting-copy">{item.market}</p>
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
                <p className="setting-copy">{item.market}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
