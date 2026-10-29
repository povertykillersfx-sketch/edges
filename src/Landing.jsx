import { useState } from "react";
import { installClientApp, installOnArrivalPending, isAndroid } from "./pwa.js";
import "./landing.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FAQS = [
  {
    q: "How does the R400 once-off fee work for clients?",
    a: "Unlike other platforms that force traders to pay R500+ every single month for cloud VPS hosting, EA Host Hub charges clients a single R400 once-off activation fee to unlock lifetime access to the mobile app. Once unlocked, the client simply enters the license key purchased from their mentor and starts automated trading.",
  },
  {
    q: "As a Mentor, do I really keep 100% of my license key sales?",
    a: "Yes! Mentors join for free, build or connect their bots, and generate license keys at no cost. You sell your license keys directly to your students at whatever price you choose (e.g., R1,500 once-off or R800/month) and collect payment directly from them.",
  },
  {
    q: "Can a student share their license key with friends on Telegram?",
    a: "The key is locked to the MT4 or MT5 account it was issued for. Sending the code to someone else does not open the bot on another account. If a key gets out, you revoke it from the mentor portal and that account stops.",
  },
  {
    q: "Does the robot keep trading if my phone battery dies or loses data?",
    a: "Yes. The cloud engine keeps the bot running 24/5, including stop-loss and take-profit updates, even when the phone is off, the battery dies, or the signal drops.",
  },
];

async function hashPassword(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function money(value) {
  return `R ${Number(value).toLocaleString("en-US")}`;
}

function Glyph({ children, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconMenu() {
  return (
    <Glyph size={20}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Glyph>
  );
}

function IconClose() {
  return (
    <Glyph size={20}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Glyph>
  );
}

function IconUser() {
  return (
    <Glyph size={18}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </Glyph>
  );
}

function IconPhone() {
  return (
    <Glyph size={18}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </Glyph>
  );
}

function IconUsers() {
  return (
    <Glyph size={18}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Glyph>
  );
}

function IconTag() {
  return (
    <Glyph size={18}>
      <path d="M20 13.5 12.5 21a2 2 0 0 1-2.8 0L3 14.3V4h10.3L20 10.7a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
    </Glyph>
  );
}

function IconCoins() {
  return (
    <Glyph size={18}>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </Glyph>
  );
}

function IconLock() {
  return (
    <Glyph size={18}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Glyph>
  );
}

function IconCheck() {
  return (
    <Glyph size={16}>
      <path d="M20 6 9 17l-5-5" />
    </Glyph>
  );
}

function IconX() {
  return (
    <Glyph size={14}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Glyph>
  );
}

function IconCrown() {
  return (
    <Glyph size={18}>
      <path d="M3 7l4 4 5-6 5 6 4-4-2 12H5L3 7z" />
    </Glyph>
  );
}

function IconBolt() {
  return (
    <Glyph size={16}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </Glyph>
  );
}

function IconChevron() {
  return (
    <Glyph size={18}>
      <path d="m6 9 6 6 6-6" />
    </Glyph>
  );
}

function IconArrow() {
  return (
    <Glyph size={16}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Glyph>
  );
}

function Mark() {
  return <img className="landing-mark" src="/ea-hosting-logo.png" alt="" />;
}

function AuthModal({ mode, busy, error, onClose, onClient, onMentor, onSignIn }) {
  const mentor = mode === "mentor";
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event) {
    event.preventDefault();
    const address = email.trim();
    if (mentor) {
      const fullName = name.trim();
      const brand = extra.trim();
      const digits = phone.replace(/\D/g, "");
      if (!fullName || !brand || !EMAIL.test(address) || digits.length < 6 || password.length < 6) {
        onMentor(null, "Enter your name, brand name, email, WhatsApp number, and a password.");
        return;
      }
      await onMentor({
        fullName,
        displayName: brand,
        email: address,
        phone: phone.trim(),
        instagram: "",
        passwordHash: await hashPassword(password),
      });
      return;
    }
    const firstName = name.trim();
    const lastName = extra.trim();
    if (!firstName || !lastName || !EMAIL.test(address)) {
      onClient(null, "Enter your name, surname, and a valid email address.");
      return;
    }
    onClient({ firstName, lastName, email: address });
  }

  return (
    <div className="landing-modal" role="presentation" onClick={onClose}>
      <form
        className="landing-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-auth-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="landing-dialog-head">
          <h3 id="landing-auth-title">{mentor ? "Create your mentor account" : "Unlock the client app"}</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <p>
          {mentor
            ? "This opens a mentor account on the desk. An admin approves it before you can sign in and issue keys."
            : "This sends a client signup to the desk. After approval you enter the licence key in the app. The app unlock is R400 once-off."}
        </p>
        <label>
          {mentor ? "Full name" : "Name"}
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={mentor ? "Full name" : "Name"} autoComplete="name" />
        </label>
        <label>
          {mentor ? "Brand name" : "Surname"}
          <input
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            placeholder={mentor ? "Brand name" : "Surname"}
            autoComplete={mentor ? "organization" : "family-name"}
          />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" />
        </label>
        {mentor && (
          <>
            <label>
              WhatsApp number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp number" autoComplete="tel" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="new-password" />
            </label>
          </>
        )}
        {error && <p className="landing-error">{error}</p>}
        <button type="submit" className={mentor ? "landing-blue" : "landing-green"} disabled={busy}>
          {busy ? "Sending" : "Continue"}
        </button>
        <p className="landing-switch-auth">
          <button type="button" onClick={() => onSignIn(mentor ? "mentor" : "app")}>
            {mentor ? "Already a mentor? Sign in" : "Already approved? Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}

export function Landing({ onClient, onMentor, onSignIn }) {
  const [mode, setMode] = useState("");
  const [menu, setMenu] = useState(false);
  const [clients, setClients] = useState(50);
  const [price, setPrice] = useState(1500);
  const [faq, setFaq] = useState(0);
  const [error, setError] = useState("");
  const [installNote, setInstallNote] = useState(() =>
    installOnArrivalPending() ? "Tap Download Client App to install it on this phone." : ""
  );
  const [busy, setBusy] = useState(false);
  const clientPct = ((clients - 1) / 499) * 100;
  const pricePct = ((price - 500) / 4500) * 100;

  function openModal(next) {
    setMenu(false);
    setError("");
    setMode(next);
  }

  async function downloadClientApp() {
    setMenu(false);
    if (isAndroid()) {
      const result = await installClientApp();
      setInstallNote(
        result === "unavailable"
          ? "The install prompt is not ready yet. Open the browser menu and choose Install app."
          : ""
      );
      return;
    }
    openModal("client");
  }

  async function submitMentor(person, problem) {
    if (!person) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onMentor(person);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing">
      <header className="landing-bar">
        <div className="landing-col landing-bar-inner">
          <a className="landing-brand" href="#top" onClick={() => setMenu(false)}>
            <Mark />
            <span>
              <strong>
                EA Host <em>Hub</em>
              </strong>
              <small>Mobile bot ecosystem</small>
            </span>
          </a>
          <button type="button" className="landing-menu" aria-expanded={menu} aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu((open) => !open)}>
            {menu ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        {menu && (
          <nav className="landing-drawer" aria-label="Page">
            <a href="#calculator" onClick={() => setMenu(false)}>Mentor calculator</a>
            <a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a>
            <a href="#comparison" onClick={() => setMenu(false)}>Why switch</a>
            <a href="#pricing" onClick={() => setMenu(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMenu(false)}>Questions</a>
            <button type="button" onClick={() => openModal("mentor")}>Become a mentor</button>
            <button type="button" onClick={downloadClientApp}>Download client app</button>
          </nav>
        )}
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-col">
            <p className="landing-pill">
              <i /> #1 mobile EA hosting platform
            </p>
            <h1>
              Build, Host &amp; Resell Your Own <span>Mobile Trading Robots.</span>
            </h1>
            <p className="landing-lead">
              <b>Mentors:</b> Turn your trading strategy into a recurring license business with zero piracy.{" "}
              <b>Clients:</b> Automate your MT4 &amp; MT5 accounts straight from your phone for a <u>R400 once-off app fee</u>
              —no monthly VPS required.
            </p>
            <div className="landing-cta">
              <button type="button" className="landing-gradient" onClick={() => openModal("mentor")}>
                <IconUser /> Become a Mentor — Start Free
              </button>
              <button type="button" className="landing-outline" onClick={downloadClientApp}>
                <IconPhone /> Download Client App
              </button>
              {installNote && <p className="landing-install-note">{installNote}</p>}
            </div>
            <dl className="landing-stats">
              <div>
                <dt>100%</dt>
                <dd>Anti-Leak IP Protection</dd>
              </div>
              <div>
                <dt className="green">R400</dt>
                <dd>Once-Off Client Unlock</dd>
              </div>
              <div>
                <dt className="blue">MT4/MT5</dt>
                <dd>Live Cloud SL/TP Sync</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="calculator" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill tight">Mentor profit calculator</p>
            <h2>Calculate Your Bot Licensing Revenue</h2>
            <p className="landing-lead">
              You set your own license key price and keep <strong>100% of your sales</strong>. Your students simply pay a once-off R400 fee to unlock the mobile app.
            </p>

            <label className="landing-slider">
              <span>
                <IconUsers /> Number of Active Students / Clients
                <b className="count">{clients} Clients</b>
              </span>
              <input
                type="range"
                min="1"
                max="500"
                step="1"
                value={clients}
                style={{ background: `linear-gradient(90deg, #22c55e ${clientPct}%, #1e293b ${clientPct}%)` }}
                onChange={(event) => setClients(Number(event.target.value))}
              />
              <small className="scale clients">
                <i>1 Client</i>
                <i>100 Clients</i>
                <i>250 Clients</i>
                <i>500 Clients</i>
              </small>
            </label>

            <label className="landing-slider">
              <span>
                <IconTag /> Your License Key Price (ZAR)
                <b className="price">{money(price)}</b>
              </span>
              <input
                type="range"
                min="500"
                max="5000"
                step="50"
                value={price}
                style={{ background: `linear-gradient(90deg, #22c55e ${pricePct}%, #1e293b ${pricePct}%)` }}
                onChange={(event) => setPrice(Number(event.target.value))}
              />
              <small className="scale price">
                <i>R500</i>
                <i>R1,500</i>
                <i>R3,000</i>
                <i>R5,000</i>
              </small>
            </label>

            <div className="landing-fee">
              <IconCoins />
              <div>
                <strong>Platform Cost to Mentor: R0</strong>
                <span>Zero commission on your keys</span>
              </div>
            </div>
            <div className="landing-fee lock">
              <IconLock />
              <div>
                <strong>Client App Unlock: R400</strong>
                <span>Paid once-off by the client</span>
              </div>
            </div>

            <div className="landing-total">
              <span>Your estimated mentor revenue</span>
              <strong>{money(clients * price)}</strong>
              <p>100% paid directly to you by your clients. Manage all license expirations and MT4/MT5 account locks from one dashboard.</p>
              <div className="landing-cut">
                <span>Mentor Platform Cut:</span>
                <b>R 0.00 (0%)</b>
              </div>
              <button type="button" className="landing-green" onClick={() => openModal("mentor")}>
                Start Hosting Your Bot Free <IconArrow />
              </button>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill tight">Zero VPS · Zero complexity</p>
            <h2>How EA Host Hub Works in 3 Steps</h2>
            <p className="landing-lead">A seamless ecosystem connecting Forex Mentors directly to their clients&apos; mobile phones.</p>
            <ol className="landing-steps">
              <li>
                <span>01</span>
                <small>For mentors</small>
                <h3>Build Bot &amp; Issue Keys</h3>
                <p>Configure your custom trading robot directly inside our Mentor Portal or link your strategy. Generate encrypted license keys locked to specific MT4/MT5 account numbers.</p>
              </li>
              <li>
                <span>02</span>
                <small>For clients / students</small>
                <h3>R400 Once-Off App Unlock</h3>
                <p>Clients download the EA Host Hub mobile app, pay a once-off R400 lifetime activation fee, paste their mentor&apos;s license key, and link their MT4/MT5 broker login.</p>
              </li>
              <li>
                <span>03</span>
                <small>24/5 cloud execution</small>
                <h3>Automated Mobile Trading</h3>
                <p>Our cloud engine executes trades 24/5 with instant Stop-Loss and Take-Profit synchronization—even when the client&apos;s phone battery dies or loses signal.</p>
              </li>
            </ol>
          </div>
        </section>

        <section id="comparison" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill tight">Side-by-side comparison</p>
            <h2>Why Mentors &amp; Traders Switch to EA Host Hub</h2>
            <p className="landing-lead">Stop losing money to leaked <code>.ex4</code> files on Telegram or forcing students to pay expensive monthly VPS hosting fees.</p>
            <ul className="landing-compare">
              <li>
                <h3>Client App Access Cost</h3>
                <p><span>EA Host Hub</span><b>R400 Once-Off (Lifetime)</b></p>
                <p><span>Raw .ex4 / .ex5 files</span><b>Requires R350+/mo VPS</b></p>
                <p><span>Other hosting apps</span><b>R500–R900 Monthly Fees</b></p>
              </li>
              <li>
                <h3>Piracy &amp; Leak Protection</h3>
                <p><span>EA Host Hub</span><b><IconCheck /> 100% Cloud Locked</b></p>
                <p className="bad"><span>Raw .ex4 / .ex5 files</span><b><IconX /> Easily Cracked &amp; Shared</b></p>
                <p><span>Other hosting apps</span><b>Partial Protection</b></p>
              </li>
              <li>
                <h3>Built-in Mobile Bot Creator</h3>
                <p><span>EA Host Hub</span><b><IconCheck /> Included for Mentors</b></p>
                <p className="bad"><span>Raw .ex4 / .ex5 files</span><b><IconX /> Must Hire MQL Coder</b></p>
                <p><span>Other hosting apps</span><b>Requires PC Setup</b></p>
              </li>
              <li>
                <h3>1-Click License Kill Switch</h3>
                <p><span>EA Host Hub</span><b><IconCheck /> Instant Revocation</b></p>
                <p className="bad"><span>Raw .ex4 / .ex5 files</span><b><IconX /> Impossible Once Sent</b></p>
                <p><span>Other hosting apps</span><b>Manual Support Ticket</b></p>
              </li>
              <li>
                <h3>24/5 Offline Phone Execution</h3>
                <p><span>EA Host Hub</span><b><IconCheck /> Dedicated Cloud Engine</b></p>
                <p><span>Raw .ex4 / .ex5 files</span><b>PC Must Stay On 24/7</b></p>
                <p><span>Other hosting apps</span><b>Mentor PC Required</b></p>
              </li>
            </ul>
          </div>
        </section>

        <section id="pricing" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill tight">Simple, transparent pricing</p>
            <h2>No Monthly Subscriptions. No Hidden VPS Costs.</h2>
            <p className="landing-lead">Whether you&apos;re a Forex Mentor scaling your signal group or a Trader automating your mobile account, our pricing is built for maximum profit.</p>
            <article className="landing-plan mentor">
              <div className="landing-plan-top">
                <span>For forex mentors (B2B)</span>
                <IconCrown />
              </div>
              <h3>Mentor Partner Portal</h3>
              <p>Host your trading bots, generate keys &amp; resell to your clients.</p>
              <p className="landing-amount">
                R0 <small>/ Free to Host &amp; Generate Keys</small>
              </p>
              <ul>
                <li><IconCheck /> Keep 100% of what you charge clients for keys</li>
                <li><IconCheck /> Built-in Mobile Bot Creator &amp; Strategy Host</li>
                <li><IconCheck /> Unlimited License Key Generation (MT4 &amp; MT5)</li>
                <li><IconCheck /> 1-Click Client License Revocation &amp; Expiry Control</li>
                <li><IconCheck /> Custom Bot Branding Inside Client App</li>
              </ul>
              <button type="button" className="landing-blue" onClick={() => openModal("mentor")}>
                Create Free Mentor Account <IconArrow />
              </button>
            </article>
            <article className="landing-plan client">
              <div className="landing-plan-top">
                <span>For traders &amp; students (B2C)</span>
                <IconPhone />
              </div>
              <h3>Client Mobile App Access</h3>
              <p>Plug in your mentor&apos;s license key &amp; automate your broker account.</p>
              <p className="landing-amount green">
                R400 <small>/ Once-Off Lifetime App Unlock</small>
              </p>
              <ul>
                <li><IconCheck /> Pay Once (R400) — Zero monthly VPS or server fees</li>
                <li><IconCheck /> Connect any MT4 or MT5 Broker Worldwide</li>
                <li><IconCheck /> Instant License Key Activation from Your Mentor</li>
                <li><IconCheck /> 24/5 Cloud Execution (Trades even when phone is off)</li>
                <li><IconCheck /> Real-Time SL/TP Sync &amp; Mobile Push Notifications</li>
              </ul>
              <button type="button" className="landing-green" onClick={() => openModal("client")}>
                Unlock App for R400 Once-Off <IconBolt />
              </button>
            </article>
          </div>
        </section>

        <section id="faq" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill tight">Got questions?</p>
            <h2>Frequently Asked Questions</h2>
            <div className="landing-faqs">
              {FAQS.map((item, index) => {
                const open = faq === index;
                return (
                  <article key={item.q} className={open ? "open" : ""}>
                    <button type="button" aria-expanded={open} onClick={() => setFaq(open ? -1 : index)}>
                      {item.q}
                      <IconChevron />
                    </button>
                    {open && <p>{item.a}</p>}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {mode && (
        <AuthModal
          key={mode}
          mode={mode}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) setMode("");
          }}
          onClient={(person, problem) => {
            if (!person) {
              setError(problem);
              return;
            }
            setError("");
            onClient(person);
          }}
          onMentor={submitMentor}
          onSignIn={(next) => {
            setMode("");
            onSignIn(next);
          }}
        />
      )}
    </div>
  );
}
