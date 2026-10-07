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
    ["mentors", "Approve mentors", pending ? `${pending} pending · ${mentors} approved` : `${mentors} approved`],
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
      <p className="portal-label">Approved mentors</p>
      {mentors === 0 ? (
        <p className="setting-copy">No approved mentors.</p>
      ) : (
        <ul className="portal-rows">
          {portal.mentors
            .filter((item) => item.status === "approved")
            .map((item) => (
              <li key={item.id}>
                <div>
                  <p className="setting-title">{item.displayName || item.name}</p>
                  <p className="setting-copy">{[item.email, item.phone].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
        </ul>
      )}
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
  const [profileId, setProfileId] = useState("");
  const selected = approved.find((item) => item.id === profileId) ?? null;

  function setStatus(id, status) {
    onPatch({
      mentors: portal.mentors.map((item) => (item.id === id ? { ...item, status } : item)),
    });
  }

  function saveProfile(next) {
    onPatch({
      mentors: portal.mentors.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              displayName: next.displayName,
              name: next.displayName,
              fullName: next.fullName,
              firstName: next.fullName,
              phone: next.phone,
              instagram: next.instagram,
            }
          : item
      ),
    });
  }

  if (selected) {
    return (
      <>
        <button type="button" className="text-btn profile-back" onClick={() => setProfileId("")}>
          Mentors
        </button>
        <MentorProfile mentor={selected} onSave={saveProfile} />
      </>
    );
  }

  return (
    <>
      <p className="setting-copy">
        Mentor signups wait here. Approve one before that person can open the mentor portal.
      </p>
      <p className="portal-label">Approved</p>
      {approved.length === 0 ? (
        <p className="setting-copy">No approved mentors.</p>
      ) : (
        <ul className="portal-rows">
          {approved.map((item) => (
            <li key={item.id}>
              <div>
                <p className="setting-title">{item.displayName || item.name}</p>
                <p className="setting-copy">
                  {[item.email, item.phone, item.instagram].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" className="text-btn" onClick={() => setProfileId(item.id)}>
                Profile
              </button>
            </li>
          ))}
        </ul>
      )}
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
              : view === "profile"
                ? "Profile"
                : "Dashboard";

  return (
    <section className="portal mentor-desk" ref={scroller} aria-labelledby="portal-title">
      {view === "menu" ? (
        <MentorMenu label={label} onOpen={setView} onLogout={onLogout} />
      ) : view === "eas" ? (
        <ManageEas
          profiles={profiles}
          mentorId={mentor?.id ?? ""}
          mentorName={label}
          onPatch={patchMine}
          onMenu={() => setView("menu")}
        />
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
          {view === "stats" && <MentorStats keys={keys} />}
          {view === "copy" && (
            <p className="setting-copy">Copy trading is not live on this desk yet.</p>
          )}
          {view === "wallet" && <p className="setting-copy">No wallet is connected on this desk.</p>}
          {view === "profile" && mentor && (
            <MentorProfile
              mentor={mentor}
              onSave={(next) => {
                onChange({
                  ...portal,
                  mentors: portal.mentors.map((item) =>
                    item.id === mentor.id
                      ? {
                          ...item,
                          displayName: next.displayName,
                          name: next.displayName,
                          fullName: next.fullName,
                          firstName: next.fullName,
                          phone: next.phone,
                          instagram: next.instagram,
                        }
                      : item
                  ),
                });
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

const EA_SLOTS = 1;

function fitPicture(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 480 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const data = canvas.toDataURL("image/jpeg", 0.82);
      if (!data.startsWith("data:image/") || data.length >= 500000) {
        reject(new Error("That image is too large to keep on this desk."));
        return;
      }
      resolve(data);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be read."));
    };
    image.src = url;
  });
}

function readClip(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 1200000) {
      reject(new Error("That file is too large to keep on this desk."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      const ok = data.startsWith("data:image/gif") || data.startsWith("data:video/");
      if (!ok || data.length >= 1500000) {
        reject(new Error("That file is too large to keep on this desk."));
        return;
      }
      resolve(data);
    };
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

function ManageEas({ profiles, mentorId, mentorName, onPatch, onMenu }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [picture, setPicture] = useState("");
  const [media, setMedia] = useState("");
  const [symbol, setSymbol] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [error, setError] = useState("");
  const imageRef = useRef(null);
  const mediaRef = useRef(null);

  function resetForm() {
    setName("");
    setPicture("");
    setMedia("");
    setSymbol("");
    setSymbols([]);
    setError("");
  }

  function closeSheet() {
    setOpen(false);
    resetForm();
  }

  async function onImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    try {
      setPicture(await fitPicture(file));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function onMedia(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "image/gif" && file.type !== "video/mp4" && file.type !== "video/webm") {
      setError("Use an MP4, WebM, or GIF.");
      return;
    }
    try {
      setMedia(await readClip(file));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  function addSymbol() {
    const typed = symbol.trim().toUpperCase();
    if (!typed) return;
    const known = SYMBOLS.find((item) => item.id === typed);
    if (!known) {
      setError("That symbol is not on this desk.");
      return;
    }
    setSymbols((current) => (current.includes(known.id) ? current : [...current, known.id]));
    setSymbol("");
    setError("");
  }

  function save(event) {
    event.preventDefault();
    const eaName = name.trim();
    if (profiles.length >= EA_SLOTS) {
      setError("This account can keep 1 EA.");
      return;
    }
    if (!eaName) {
      setError("Enter an EA name.");
      return;
    }
    if (symbols.length === 0) {
      setError("Add at least one symbol.");
      return;
    }
    onPatch({
      profiles: [
        {
          id: crypto.randomUUID(),
          name: eaName,
          mentorName,
          mentorId,
          symbols,
          picture,
          media,
          at: Date.now(),
        },
        ...profiles,
      ],
    });
    closeSheet();
  }

  return (
    <div className="ea-page">
      <button type="button" className="ea-menu" aria-label="Menu" onClick={onMenu}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M5 7h14M5 12h14M5 17h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="ea-head">
        <div>
          <h2 id="portal-title">Manage EAs</h2>
          <p>Create and manage your Expert Advisors</p>
        </div>
        <button type="button" className="ea-create" onClick={() => setOpen(true)}>
          <span aria-hidden="true">+</span> Create EA
        </button>
      </div>
      <p className="ea-tier">
        No tier yet — 1 EA · {profiles.length}/{EA_SLOTS} used
      </p>
      {profiles.length === 0 ? (
        <div className="ea-empty">
          <DeskIcon name="bot" />
          <p>No EAs created yet. Click &quot;Create EA&quot; to get started.</p>
        </div>
      ) : (
        <ul className="ea-list">
          {profiles.map((item) => (
            <li key={item.id} className="ea-card">
              {item.picture ? (
                <img src={item.picture} alt="" />
              ) : item.media?.startsWith("data:image/") ? (
                <img src={item.media} alt="" />
              ) : item.media?.startsWith("data:video/") ? (
                <video src={item.media} muted />
              ) : (
                <span className="ea-fallback" aria-hidden="true">
                  <DeskIcon name="bot" />
                </span>
              )}
              <div>
                <p className="setting-title">{item.name}</p>
                <p className="setting-copy">{item.symbols.join(", ")}</p>
              </div>
              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  onPatch({ profiles: profiles.filter((profile) => profile.id !== item.id) })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <footer className="ea-foot">
        <img src="/edgex-logo.png" alt="" />
        <strong>
          edge<span>X</span>
        </strong>
        <span className="ea-online">
          <i /> Systems online
        </span>
      </footer>
      {open && (
        <div className="ea-sheet">
          <form className="ea-sheet-card" onSubmit={save}>
            <div className="ea-sheet-head">
              <h3>New Expert Advisor</h3>
              <button type="button" className="ea-close" aria-label="Close" onClick={closeSheet}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    d="M7 7l10 10M17 7 7 17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <label className="ea-field">
              EA Name
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="e.g. Gold Scalper Pro"
                maxLength={40}
              />
            </label>
            <div className="ea-field">
              <span>EA Image</span>
              <div className="ea-media-row">
                <span className="ea-preview">
                  {picture ? <img src={picture} alt="" /> : <MediaGlyph />}
                </span>
                <button type="button" className="ea-upload" onClick={() => imageRef.current?.click()}>
                  <MediaGlyph /> Upload Image
                </button>
                <input
                  ref={imageRef}
                  className="brand-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onImage}
                />
              </div>
            </div>
            <div className="ea-field">
              <span>
                EA Video / GIF <em className="ea-unlocked">Unlocked</em>
              </span>
              <span className="ea-preview wide">
                {media?.startsWith("data:image/") ? (
                  <img src={media} alt="" />
                ) : media?.startsWith("data:video/") ? (
                  <video src={media} muted />
                ) : (
                  "No video"
                )}
              </span>
              <button type="button" className="ea-upload" onClick={() => mediaRef.current?.click()}>
                <MediaGlyph /> Upload Video / GIF
              </button>
              <input
                ref={mediaRef}
                className="brand-file"
                type="file"
                accept="image/gif,video/mp4,video/webm"
                onChange={onMedia}
              />
              <p className="ea-note">Max 25 MB. MP4 / WebM / GIF recommended.</p>
            </div>
            <div className="ea-field">
              <span>Symbols</span>
              <div className="ea-symbol-row">
                <input
                  value={symbol}
                  onChange={(event) => {
                    setSymbol(event.target.value);
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSymbol();
                    }
                  }}
                  placeholder="e.g. XAUUSD"
                  aria-label="Symbol"
                />
                <button type="button" className="ea-add" onClick={addSymbol}>
                  Add
                </button>
              </div>
              {symbols.length > 0 && (
                <div className="ea-chips">
                  {symbols.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="ea-chip"
                      onClick={() => setSymbols((current) => current.filter((item) => item !== id))}
                    >
                      {id} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="ea-save">
              Save EA
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MediaGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 16.2 10.6 13l2.6 2 3.2-3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
      <button type="button" className="desk-user" onClick={() => onOpen("profile")}>
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
      </button>
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
        <button type="button" onClick={() => onOpen("profile")}>
          <DeskIcon name="user" /> Profile
        </button>
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

function MentorProfile({ mentor, onSave }) {
  const [displayName, setDisplayName] = useState(mentor.displayName || mentor.name || "");
  const [fullName, setFullName] = useState(mentor.fullName || mentor.firstName || "");
  const [phone, setPhone] = useState(mentor.phone || "");
  const [instagram, setInstagram] = useState(mentor.instagram || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function save(event) {
    event.preventDefault();
    const shown = displayName.trim();
    const name = fullName.trim();
    if (!shown || !name) {
      setError("Enter your display name and full name.");
      setSaved(false);
      return;
    }
    onSave({ displayName: shown, fullName: name, phone: phone.trim(), instagram: instagram.trim() });
    setError("");
    setSaved(true);
  }

  return (
    <form className="portal-form" onSubmit={save}>
      <label>
        Display name
        <input
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setSaved(false);
            setError("");
          }}
          placeholder="Display name"
        />
      </label>
      <label>
        Full name
        <input
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setSaved(false);
            setError("");
          }}
          placeholder="Full name"
          autoComplete="name"
        />
      </label>
      <label>
        Email
        <input type="email" value={mentor.email} readOnly aria-readonly="true" />
      </label>
      <label>
        Contact number
        <input
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setSaved(false);
          }}
          placeholder="Contact number"
          inputMode="tel"
          autoComplete="tel"
        />
      </label>
      <label>
        Instagram link
        <input
          value={instagram}
          onChange={(event) => {
            setInstagram(event.target.value);
            setSaved(false);
          }}
          placeholder="Instagram link (optional)"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      {saved && <p className="setting-copy">Profile saved.</p>}
      <button type="submit" className="connect-btn">
        Save profile
      </button>
    </form>
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

