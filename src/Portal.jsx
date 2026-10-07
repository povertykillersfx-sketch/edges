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

export function Portal({ portal, onChange, onClose, onLogout, role = "admin" }) {
  const [view, setView] = useState("dashboard");
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [view]);

  function patch(next) {
    onChange({ ...portal, ...next });
  }

  if (role === "mentor") {
    return <MentorPortal portal={portal} onChange={onChange} onLogout={onLogout} />;
  }

  return (
    <section className="portal" ref={scroller} aria-labelledby="portal-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Super admin</p>
          <h2 id="portal-title">{view === "dashboard" ? "Super admin" : VIEWS[view]}</h2>
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

function LicenseKeys({ portal, onPatch, mentorId = "" }) {
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
      mentorId: mentorId || "",
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

function EaProfiles({ portal, onPatch, mentorId = "", lockedMentor = "" }) {
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
    const mentor = lockedMentor || mentorName.trim();
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
          mentorId: mentorId || "",
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
        {lockedMentor ? (
          <p className="setting-copy">Mentor · {lockedMentor}</p>
        ) : (
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
        )}
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
        Mentor signups wait here. Approve one before that person can open the mentor portal.
      </p>
      <p className="portal-label">Waiting</p>
      {pending.length === 0 ? (
        <p className="setting-copy">No mentor signups waiting for approval.</p>
      ) : (
        <ul className="portal-rows">
          {pending.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.displayName || item.name}</p>
                <p className="setting-copy">{[item.email, item.phone, item.market].filter(Boolean).join(" · ")}</p>
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
                <p className="setting-title">{item.displayName || item.name}</p>
                <p className="setting-copy">{[item.email, item.phone, item.market].filter(Boolean).join(" · ")}</p>
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
                  <p className="setting-title">{item.displayName || item.name}</p>
                  <p className="setting-copy">{[item.email, item.phone, item.market].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function signedInMentor(portal) {
  const email = portal.identity?.email?.toLowerCase() ?? "";
  if (!email) return null;
  return (
    portal.mentors.find((item) => item.status === "approved" && item.email.toLowerCase() === email) ??
    null
  );
}

function MentorPortal({ portal, onChange, onLogout }) {
  const mentor = signedInMentor(portal);
  const [view, setView] = useState("menu");
  const scroller = useRef(null);
  const profiles = portal.profiles.filter((item) => mentor && item.mentorId === mentor.id);
  const keys = portal.keys.filter((item) => mentor && item.mentorId === mentor.id);
  const scoped = { ...portal, profiles, keys };
  const label = mentor?.displayName || mentor?.name || "Mentor";

  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [view]);

  function patchMine(next) {
    const patch = {};
    if (next.profiles) {
      patch.profiles = [
        ...next.profiles,
        ...portal.profiles.filter((item) => item.mentorId !== mentor?.id),
      ];
    }
    if (next.keys) {
      patch.keys = [...next.keys, ...portal.keys.filter((item) => item.mentorId !== mentor?.id)];
    }
    onChange({ ...portal, ...next, ...patch });
  }

  const title =
    view === "license"
      ? "Generate Key"
      : view === "eas"
        ? "Manage EAs"
        : view === "stats"
          ? "Key Stats"
          : view === "copy"
            ? "Copy Trading"
            : view === "wallet"
              ? "Wallet"
              : "Dashboard";

  return (
    <section className="portal mentor-desk" ref={scroller} aria-labelledby="portal-title">
      {view === "menu" ? (
        <MentorMenu label={label} onOpen={setView} onLogout={onLogout} />
      ) : (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">Mentor</p>
              <h2 id="portal-title">{title}</h2>
            </div>
            <button type="button" className="text-btn" onClick={() => setView("menu")}>
              Menu
            </button>
          </header>
          {view === "dashboard" && <MentorHome profiles={profiles} keys={keys} />}
          {view === "license" && (
            <LicenseKeys portal={scoped} onPatch={patchMine} mentorId={mentor?.id ?? ""} />
          )}
          {view === "eas" && (
            <EaProfiles
              portal={scoped}
              onPatch={patchMine}
              mentorId={mentor?.id ?? ""}
              lockedMentor={label}
            />
          )}
          {view === "stats" && <MentorStats keys={keys} />}
          {view === "copy" && (
            <p className="setting-copy">Copy trading is not live on this desk yet.</p>
          )}
          {view === "wallet" && <p className="setting-copy">No wallet is connected on this desk.</p>}
        </>
      )}
    </section>
  );
}

function MentorMenu({ label, onOpen, onLogout }) {
  return (
    <div className="desk-menu">
      <div className="desk-brand">
        <img src="/edgex-logo.png" alt="" />
        <h2 id="portal-title">
          edge<span>X</span>
        </h2>
      </div>
      <div className="desk-user">
        <span className="desk-avatar" aria-hidden="true">
          <DeskIcon name="user" />
        </span>
        <span>
          <strong>{label}</strong>
          <small>Mentor</small>
        </span>
        <span className="desk-chevron" aria-hidden="true">
          ›
        </span>
      </div>
      <nav className="desk-nav" aria-label="Mentor portal">
        <button type="button" onClick={() => onOpen("dashboard")}>
          <DeskIcon name="grid" /> Dashboard
        </button>
        <button type="button" onClick={() => onOpen("license")}>
          <DeskIcon name="key" /> Generate Key
        </button>
        <button type="button" onClick={() => onOpen("eas")}>
          <DeskIcon name="bot" /> Manage EAs
        </button>
        <p>Management</p>
        <button type="button" onClick={() => onOpen("stats")}>
          <DeskIcon name="chart" /> Key Stats
        </button>
        <p>Trading</p>
        <button type="button" onClick={() => onOpen("copy")}>
          <DeskIcon name="swap" /> Copy Trading <span className="desk-new">New</span>
        </button>
        <p>My wallet</p>
        <button type="button" onClick={() => onOpen("wallet")}>
          <DeskIcon name="wallet" /> Wallet
        </button>
        <p>Sales page</p>
      </nav>
      <button type="button" className="desk-logout" onClick={onLogout}>
        <DeskIcon name="logout" /> Log out
      </button>
    </div>
  );
}

function MentorHome({ profiles, keys }) {
  const active = keys.filter((item) => item.status === "active").length;
  return (
    <dl className="portal-stats">
      <div>
        <dt>Active keys</dt>
        <dd>{active}</dd>
      </div>
      <div>
        <dt>EAs</dt>
        <dd>{profiles.length}</dd>
      </div>
    </dl>
  );
}

function MentorStats({ keys }) {
  const active = keys.filter((item) => item.status === "active").length;
  const revoked = keys.filter((item) => item.status === "revoked").length;
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
      </dl>
      {keys.length === 0 ? (
        <p className="setting-copy">No keys yet.</p>
      ) : (
        <ul className="portal-rows">
          {keys.map((item) => (
            <li key={item.id}>
              <div>
                <p className="license-code">{item.code}</p>
                <p className="setting-copy">
                  {item.status === "active" ? "Active" : "Revoked"}
                  {item.eaName ? ` · ${item.eaName}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function DeskIcon({ name }) {
  const props = {
    viewBox: "0 0 24 24",
    width: "20",
    height: "20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  if (name === "grid") {
    return (
      <svg {...props}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
      </svg>
    );
  }
  if (name === "key") {
    return (
      <svg {...props}>
        <circle cx="8" cy="15" r="3" />
        <path d="M10.8 15H20M16.5 15v2.6M19.2 15v2" />
      </svg>
    );
  }
  if (name === "bot") {
    return (
      <svg {...props}>
        <rect x="6" y="8" width="12" height="10" rx="3" />
        <path d="M12 8V5M9 13h.01M15 13h.01" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg {...props}>
        <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
      </svg>
    );
  }
  if (name === "swap") {
    return (
      <svg {...props}>
        <path d="M7 7h11l-3-3M17 17H6l3 3" />
      </svg>
    );
  }
  if (name === "wallet") {
    return (
      <svg {...props}>
        <rect x="3.5" y="6.5" width="17" height="12" rx="2" />
        <path d="M16 12.5h4v3h-4a1.5 1.5 0 0 1 0-3z" />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg {...props}>
        <path d="M10 7V5h9v14h-9v-2M5 12h9M11 9l3 3-3 3" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="9" r="3" />
      <path d="M6.5 18.5c1.2-2.4 3.1-3.5 5.5-3.5s4.3 1.1 5.5 3.5" />
    </svg>
  );
}

