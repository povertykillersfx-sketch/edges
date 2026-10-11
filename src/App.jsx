import { useEffect, useRef, useState } from "react";
import { ACCENTS, EMPTY_PORTAL, FONTS, SYMBOLS, WORD_COLORS, loadDesk, saveDesk } from "./data.js";
import {
  applyAssetUrls,
  isEmptyPortal,
  loadRemotePortal,
  mergePortal,
  rememberRemote,
  saveMentor,
  saveSubscription,
  syncPortal,
} from "./remote.js";
import { isRemote } from "./supabase.js";
import {
  direction,
  formatElapsed,
  formatPrice,
  openSession,
  syncBook,
  tickBook,
} from "./session.js";
import {
  IconHome,
  IconRemove,
  IconSettings,
  IconStart,
  IconStop,
  IconSymbols,
  IconTape,
} from "./icons.jsx";
import { ChartScanner } from "./ChartScanner.jsx";
import { Login } from "./Login.jsx";
import { Portal } from "./Portal.jsx";
import { Mascot } from "./Mascot.jsx";

const saved = loadDesk();
const ADMIN_PATH = "/admin";

function deskPath(path = window.location.pathname) {
  const normal = path.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return normal === ADMIN_PATH ? ADMIN_PATH : "/";
}

const openedOnAdmin = deskPath() === ADMIN_PATH;

function useToast() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function push(text) {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2400);
  }

  function dismiss() {
    clearTimeout(timer.current);
    setMessage(null);
  }

  return [message, push, dismiss];
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [picked, setPicked] = useState(saved?.picked ?? ["EURUSD", "XAUUSD"]);
  const [theme, setTheme] = useState(
    saved?.theme ?? { font: "Outfit", word: "#f4f1ea", accent: "#c8f54a", ink: "#16180d" }
  );
  const [mt5, setMt5] = useState(saved?.mt5 ?? { login: "", server: "", connected: false });
  const [trades, setTrades] = useState(saved?.trades ?? []);
  const [portal, setPortal] = useState(saved?.portal ?? EMPTY_PORTAL);
  const [portalOpen, setPortalOpen] = useState(false);
  const settingsTaps = useRef([]);
  const logoTaps = useRef([]);
  const [mt5Password, setMt5Password] = useState("");
  const [mt5Phase, setMt5Phase] = useState("idle");
  const [mt5Error, setMt5Error] = useState("");
  const connectTimer = useRef(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [book, setBook] = useState(() => openSession(saved?.picked ?? ["EURUSD", "XAUUSD"]));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(
    openedOnAdmin && saved?.account !== "mentor" && saved?.account !== "admin"
  );
  const [signedIn, setSignedIn] = useState(saved?.signedIn === true);
  const [account, setAccount] = useState(saved?.account || "");
  const [entry, setEntry] = useState(openedOnAdmin || saved?.entry === "mentor" ? "mentor" : "app");
  const [mentorId, setMentorId] = useState(saved?.mentorId || "");
  const [toast, pushToast, dismissToast] = useToast();
  const [remoteReady, setRemoteReady] = useState(!isRemote);
  const portalRef = useRef(portal);
  const toastRef = useRef(pushToast);
  const accountRef = useRef(account);
  const mentorIdRef = useRef(mentorId);
  portalRef.current = portal;
  toastRef.current = pushToast;
  accountRef.current = account;
  mentorIdRef.current = mentorId;
  const onMentorSide =
    (signedIn && (account === "mentor" || account === "admin")) ||
    ((loginOpen || !signedIn) && account !== "mentor" && account !== "admin" && entry === "mentor");

  useEffect(() => {
    saveDesk({ picked, confirmRemove: true, theme, mt5, trades, portal, signedIn, account, entry, mentorId });
  }, [picked, theme, mt5, trades, portal, signedIn, account, entry, mentorId]);

  useEffect(() => {
    const next = onMentorSide ? ADMIN_PATH : "/";
    if (window.location.pathname === next) return;
    if (deskPath() === next) {
      window.history.replaceState({ edgex: next }, "", next);
      return;
    }
    window.history.pushState({ edgex: next }, "", next);
  }, [onMentorSide]);

  useEffect(() => {
    function onPop() {
      const admin = deskPath() === ADMIN_PATH;
      if (signedIn && (account === "mentor" || account === "admin")) {
        if (!admin) window.history.replaceState({ edgex: ADMIN_PATH }, "", ADMIN_PATH);
        return;
      }
      if (admin) {
        setEntry("mentor");
        setLoginOpen(true);
        return;
      }
      setEntry("app");
      setLoginOpen(false);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [signedIn, account]);

  useEffect(() => {
    if (!isRemote) return undefined;
    let cancel = false;
    loadRemotePortal()
      .then(async (remote) => {
        if (cancel) return;
        if (remote && !isEmptyPortal(remote)) {
          setPortal((current) => mergePortal(current, remote, { takeRemoteIdentity: true }));
          rememberRemote(remote);
        } else if (!isEmptyPortal(portalRef.current)) {
          const replacements = await syncPortal(portalRef.current, {
            account: accountRef.current,
            mentorId: mentorIdRef.current,
          });
          if (!cancel && replacements) {
            setPortal((current) => applyAssetUrls(current, replacements));
          }
        }
        if (!cancel) setRemoteReady(true);
      })
      .catch(() => {
        if (!cancel) toastRef.current("The database did not respond. This browser copy is still here.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!isRemote || account !== "admin") return undefined;
    let cancel = false;
    async function pullSignups() {
      try {
        const remote = await loadRemotePortal();
        if (cancel || !remote) return;
        setPortal((current) => mergePortal(current, remote));
        rememberRemote(remote);
      } catch {
        // The next pull will try again. Approvals already on this phone stay here.
      }
    }
    pullSignups();
    const id = setInterval(pullSignups, 8000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [account]);

  useEffect(() => {
    if (!isRemote || !remoteReady) return undefined;
    const id = setTimeout(() => {
      syncPortal(portal, { account, mentorId })
        .then((replacements) => {
          if (replacements) setPortal((current) => applyAssetUrls(current, replacements));
        })
        .catch(() => {
          toastRef.current("The database did not save that change.");
        });
    }, 600);
    return () => clearTimeout(id);
  }, [portal, remoteReady, account, mentorId]);

  useEffect(() => () => clearTimeout(connectTimer.current), []);

  useEffect(() => {
    if (running && picked.length === 0) setRunning(false);
  }, [picked, running]);

  useEffect(() => {
    setBook((current) => syncBook(current, picked));
  }, [picked]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setBook((current) => tickBook(current));
      setElapsed((value) => value + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    function onKey(event) {
      if (event.key !== "Escape") return;
      setSheetOpen(false);
      if (!signedIn || account === "mentor" || account === "admin") {
        setPortalOpen(account === "mentor" || account === "admin");
        return;
      }
      setLoginOpen(false);
      setPortalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signedIn, account]);

  const selected = SYMBOLS.filter((symbol) => picked.includes(symbol.id));

  function toggleSymbol(id) {
    setPicked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function removeOne(id) {
    setPicked((current) => current.filter((item) => item !== id));
    pushToast(`${id} removed`);
  }

  function requestRemove() {
    setSheetOpen(false);
    setLoginOpen(true);
  }

  function signUp(person) {
    const signup = {
      id: crypto.randomUUID(),
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      holder: `${person.firstName} ${person.lastName}`,
      status: "pending",
      plan: "",
      keyId: "",
      days: 0,
      at: Date.now(),
    };
    setPortal((current) => ({
      ...current,
      subscriptions: [signup, ...current.subscriptions],
    }));
    saveSubscription(signup).catch(() => {
      toastRef.current("The signup did not reach the desk. Check the connection and try again.");
    });
    return signup;
  }

  function signUpMentor(person) {
    const mentor = {
      id: crypto.randomUUID(),
      name: person.displayName,
      fullName: person.fullName,
      displayName: person.displayName,
      firstName: person.fullName,
      lastName: "",
      email: person.email,
      phone: person.phone,
      instagram: person.instagram,
      passwordHash: person.passwordHash,
      market: "",
      status: portal.settings.autoApprove ? "approved" : "pending",
      at: Date.now(),
    };
    setPortal((current) => ({
      ...current,
      mentors: [mentor, ...current.mentors],
    }));
    saveMentor(mentor).catch(() => {
      toastRef.current("The signup did not reach the desk. Check the connection and try again.");
    });
    return mentor;
  }

  function resetMentorPassword({ email, passwordHash }) {
    setPortal((current) => ({
      ...current,
      mentors: current.mentors.map((item) =>
        item.email.toLowerCase() === email.toLowerCase() ? { ...item, passwordHash } : item
      ),
    }));
  }

  function activateLicense({ firstName, lastName, email, key, signupId }) {
    setPortal((current) => ({
      ...current,
      identity: {
        ...current.identity,
        firstName,
        lastName,
        email,
        licenseId: key.id,
        profileId: key.profileId || current.identity.profileId,
      },
      subscriptions: current.subscriptions.map((item) =>
        item.id === signupId ? { ...item, status: "active", keyId: key.id } : item
      ),
    }));
    setLoginOpen(false);
    setTab("home");
    setSignedIn(true);
    setAccount("app");
    pushToast("License activated");
  }

  function signIn({ role, email, key, signup, mentor }) {
    if (role === "mentor" && mentor?.id) setMentorId(mentor.id);
    if (role !== "mentor") setMentorId("");
    if (role !== "mentor") {
      setPortal((current) => ({
        ...current,
        identity: {
          ...current.identity,
          firstName: signup?.firstName || current.identity.firstName,
          lastName: signup?.lastName || current.identity.lastName,
          email,
          licenseId: key?.id || current.identity.licenseId,
          profileId: key?.profileId || current.identity.profileId,
        },
        subscriptions:
          signup && key
            ? current.subscriptions.map((item) =>
                item.id === signup.id ? { ...item, status: "active", keyId: key.id } : item
              )
            : current.subscriptions,
      }));
    }
    setSignedIn(true);
    setAccount(role === "mentor" ? "mentor" : role === "admin" ? "admin" : "app");
    setLoginOpen(false);
    setPortalOpen(role === "mentor" || role === "admin");
    setEntry(role === "app" ? "app" : "mentor");
    setTab("home");
    if (role === "app") pushToast("Signed in");
  }

  function logOut() {
    setRunning(false);
    setSheetOpen(false);
    setPortalOpen(false);
    setLoginOpen(true);
    setEntry("mentor");
    setSignedIn(false);
    setAccount("");
    setMentorId("");
  }

  function connectMt5() {
    const login = mt5.login.trim();
    const server = mt5.server.trim();
    if (!/^\d{3,}$/.test(login) || !mt5Password || server.length < 3) {
      setMt5Phase("error");
      setMt5Error("Enter the MetaTrader account number, password, and server.");
      return;
    }
    setMt5Error("");
    setMt5Phase("connecting");
    clearTimeout(connectTimer.current);
    connectTimer.current = setTimeout(() => {
      setMt5({ login, server, connected: true });
      setMt5Password("");
      setMt5Phase("idle");
    }, 700);
  }

  function disconnectMt5() {
    clearTimeout(connectTimer.current);
    setMt5((current) => ({ ...current, connected: false }));
    setMt5Phase("idle");
    setMt5Error("");
  }

  function openPortalLogin() {
    setSheetOpen(false);
    setPortalOpen(false);
    setEntry("mentor");
    setLoginOpen(true);
  }

  function noteSettingsTap() {
    const now = performance.now();
    const recent = settingsTaps.current.filter((time) => now - time < 700);
    recent.push(now);
    settingsTaps.current = recent;
    if (recent.length < 3) return;
    settingsTaps.current = [];
    openPortalLogin();
  }

  function noteLogoTap() {
    const now = performance.now();
    const recent = logoTaps.current.filter((time) => now - time < 700);
    recent.push(now);
    logoTaps.current = recent;
    if (recent.length < 3) return;
    logoTaps.current = [];
    settingsTaps.current = [];
    openPortalLogin();
  }

  function selectTab(id) {
    setTab(id);
    dismissToast();
    if (id === "settings") noteSettingsTap();
    else settingsTaps.current = [];
  }

  function toggleRun() {
    if (!running && picked.length === 0) {
      pushToast("Add a symbol before starting");
      setSheetOpen(true);
      return;
    }
    if (running) {
      setRunning(false);
      pushToast("Session stopped");
      return;
    }
    setBook(openSession(picked));
    setElapsed(0);
    setRunning(true);
    pushToast("Session started");
  }

  return (
    <div className="studio">
      <div
        className="device"
        style={{
          "--sans": `"${theme.font}", "Avenir Next", "Segoe UI", sans-serif`,
          "--cream": theme.word,
          "--lime": theme.accent,
          "--lime-ink": theme.ink,
        }}
      >
        <main className="screen">
          {tab === "home" && (
            <Home
              selected={selected}
              quotes={book}
              elapsed={elapsed}
              running={running}
              branding={homeBranding(portal)}
              onRemove={requestRemove}
              onStart={toggleRun}
              onOpenSymbols={() => setSheetOpen(true)}
              onRemoveOne={removeOne}
            />
          )}
          {tab === "tape" && (
            <Tape
              mt5={mt5}
              password={mt5Password}
              phase={mt5Phase}
              error={mt5Error}
              trades={trades}
              onChange={(patch) => setMt5((current) => ({ ...current, ...patch }))}
              onPassword={setMt5Password}
              onConnect={connectMt5}
              onDisconnect={disconnectMt5}
              onExecute={(trade) => setTrades((current) => [trade, ...current])}
            />
          )}
          {tab === "settings" && (
            <Settings
              symbolCount={picked.length}
              elapsed={elapsed}
              running={running}
              theme={theme}
              onTheme={(patch) => setTheme((current) => ({ ...current, ...patch }))}
              onOpenMeta={() => setTab("tape")}
              onSecretTap={noteSettingsTap}
            />
          )}
        </main>

        {(loginOpen || !signedIn) && account !== "mentor" && account !== "admin" && (
          <Login
            key={`${signedIn ? "session" : "gate"}-${entry}`}
            gate={!signedIn}
            subscriptions={portal.subscriptions}
            mentors={portal.mentors}
            keys={portal.keys}
            onClose={() => {
              if (signedIn) setLoginOpen(false);
            }}
            onSignup={signUp}
            onMentorSignup={signUpMentor}
            onResetMentorPassword={resetMentorPassword}
            onActivate={activateLicense}
            onSignIn={signIn}
            onSecretTap={noteSettingsTap}
            onLogoTap={noteLogoTap}
            entry={entry}
          />
        )}

        {signedIn && (account === "mentor" || account === "admin") && (
          <Portal
            key={account === "mentor" ? "mentor" : "admin"}
            role={account === "mentor" ? "mentor" : "admin"}
            mentorId={mentorId}
            portal={portal}
            onChange={setPortal}
            onClose={() => setPortalOpen(false)}
            onLogout={logOut}
          />
        )}

        {sheetOpen && (
          <SymbolSheet
            picked={picked}
            onToggle={toggleSymbol}
            onClose={() => setSheetOpen(false)}
          />
        )}

        {toast && (
          <p className="toast" role="status">
            {toast}
          </p>
        )}

        <nav className="tabbar" aria-label="Primary">
          <TabButton id="home" label="Home" current={tab} onSelect={selectTab} icon={<IconHome />} />
          <TabButton id="tape" label="MetaTrader" current={tab} onSelect={selectTab} icon={<IconTape />} />
          <TabButton
            id="settings"
            label="Settings"
            current={tab}
            onSelect={selectTab}
            icon={<IconSettings />}
          />
        </nav>
      </div>
    </div>
  );
}

function homeBranding(portal) {
  const profile = (portal.profiles ?? []).find((item) => item.id === portal.identity?.profileId);
  return {
    name: profile?.name?.trim() || "",
    picture: profile?.picture || "",
  };
}

function Home({ selected, quotes, elapsed, running, branding, onRemove, onStart, onOpenSymbols, onRemoveOne }) {
  return (
    <section className="home">
      <div className="stage-card">
        <div className="stage-top">
          <span className="kicker">Session</span>
          <span className={`live-pill ${running ? "on" : ""}`}>{running ? "Live" : "Idle"}</span>
        </div>
        <Mascot live={running} src={branding.picture} alt={branding.name} />
        <h1 className={branding.name ? "wordmark ea-name" : "wordmark"}>
          {branding.name || (
            <>
              edge<em>X</em>
            </>
          )}
        </h1>
        <p className="powered">
          <i className={running ? "pulse" : ""} />
          Powered by <strong>edgeX</strong>
        </p>
      </div>

      <div className="dock">
      <div className="strip">
        <p className="status-line">
          {running
            ? `Live · ${formatElapsed(elapsed)}`
            : selected.length === 0
              ? "Armed · nothing yet"
              : `Armed · ${selected.length} symbol${selected.length === 1 ? "" : "s"}`}
        </p>
        {selected.length > 0 ? (
          <ul className="chips">
            {selected.map((symbol) => {
              const quote = quotes[symbol.id];
              return (
                <li key={symbol.id}>
                  <button type="button" className="chip" onClick={() => onRemoveOne(symbol.id)}>
                    {symbol.id}
                    {quote && (
                      <b className={`quote ${direction(quote)}`}>{formatPrice(symbol.id, quote.price)}</b>
                    )}
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">Remove {symbol.id}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-inline">Open Symbols and pick a market to arm.</p>
        )}
      </div>

      <div className="actions">
        <button type="button" className="action" onClick={onRemove}>
          <IconRemove />
          Remove
        </button>
        <button
          type="button"
          className={`action start ${running ? "is-live" : ""} ${
            selected.length === 0 ? "is-blocked" : ""
          }`}
          aria-pressed={running}
          onClick={onStart}
        >
          {running ? <IconStop /> : <IconStart />}
          {running ? "Stop" : "Start"}
        </button>
        <button type="button" className="action" onClick={onOpenSymbols}>
          {selected.length > 0 && <span className="badge">{selected.length}</span>}
          <IconSymbols />
          Symbols
        </button>
      </div>
      </div>
    </section>
  );
}

function Tape({
  mt5,
  password,
  phase,
  error,
  trades,
  onChange,
  onPassword,
  onConnect,
  onDisconnect,
  onExecute,
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h2>MetaTrader</h2>
        </div>
        <span className={`live-pill ${mt5.connected ? "on" : ""}`}>
          {mt5.connected ? "Connected" : "Offline"}
        </span>
      </header>

      {mt5.connected ? (
        <div className="account-card">
          <p className="setting-title">Account {mt5.login}</p>
          <p className="setting-copy">{mt5.server}</p>
          <button type="button" className="text-btn" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <form
          className="mt5-form"
          onSubmit={(event) => {
            event.preventDefault();
            onConnect();
          }}
        >
          <label>
            Login
            <input
              inputMode="numeric"
              autoComplete="username"
              value={mt5.login}
              onChange={(event) => onChange({ login: event.target.value })}
              placeholder="Account number"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPassword(event.target.value)}
              placeholder="MetaTrader password"
            />
          </label>
          <label>
            Server
            <input
              autoComplete="off"
              value={mt5.server}
              onChange={(event) => onChange({ server: event.target.value })}
              placeholder="Server name"
            />
          </label>
          {error && phase === "error" && <p className="form-error">{error}</p>}
          <button type="submit" className="connect-btn" disabled={phase === "connecting"}>
            {phase === "connecting" ? "Connecting" : "Connect MetaTrader"}
          </button>
        </form>
      )}

      <ChartScanner embedded mt5={mt5} trades={trades} onExecute={onExecute} />
    </section>
  );
}

function Settings({
  symbolCount,
  elapsed,
  running,
  theme,
  onTheme,
  onOpenMeta,
  onSecretTap,
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Desk</p>
          <h2 onClick={onSecretTap}>Settings</h2>
        </div>
      </header>
      <button type="button" className="setting-link" onClick={onOpenMeta}>
        <span>
          <p className="setting-title">Chart scanner</p>
          <p className="setting-copy">Open MetaTrader and scan the chart from your terminal.</p>
        </span>
        <span aria-hidden="true">›</span>
      </button>
      <section className="setting-block">
        <p className="setting-title">Font</p>
        <p className="setting-copy">Changes the words across edgeX, including MetaTrader.</p>
        <div className="choice-row">
          {FONTS.map((font) => (
            <button
              key={font}
              type="button"
              className={theme.font === font ? "choice on" : "choice"}
              style={{ fontFamily: `"${font}", sans-serif` }}
              aria-pressed={theme.font === font}
              onClick={() => onTheme({ font })}
            >
              {font}
            </button>
          ))}
        </div>
      </section>
      <section className="setting-block">
        <p className="setting-title">Word colour</p>
        <div className="swatches" role="list">
          {WORD_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={theme.word === color.value ? "swatch on" : "swatch"}
              style={{ background: color.value }}
              aria-label={color.id}
              aria-pressed={theme.word === color.value}
              onClick={() => onTheme({ word: color.value })}
            />
          ))}
        </div>
      </section>
      <section className="setting-block">
        <p className="setting-title">Accent</p>
        <div className="swatches" role="list">
          {ACCENTS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={theme.accent === color.value ? "swatch on" : "swatch"}
              style={{ background: color.value }}
              aria-label={color.id}
              aria-pressed={theme.accent === color.value}
              onClick={() => onTheme({ accent: color.value, ink: color.ink })}
            />
          ))}
        </div>
      </section>
      <p className="font-preview" style={{ fontFamily: `"${theme.font}", sans-serif` }}>
        edgeX on MetaTrader
      </p>
      <dl className="about">
        <div>
          <dt>Session</dt>
          <dd>{running ? `Live ${formatElapsed(elapsed)}` : elapsed ? `Stopped ${formatElapsed(elapsed)}` : "Idle"}</dd>
        </div>
        <div>
          <dt>Symbols</dt>
          <dd>{symbolCount}</dd>
        </div>
        <div>
          <dt>Build</dt>
          <dd>edgeX 1.0</dd>
        </div>
      </dl>
      <p className="about-copy">
        edgeX keeps the symbols you choose in one session. Start watches them. Remove opens
        activation.
      </p>
    </section>
  );
}

function SymbolSheet({ picked, onToggle, onClose }) {
  return (
    <div className="sheet" role="presentation" onClick={onClose}>
      <div
        className="sheet-card"
        role="dialog"
        aria-labelledby="sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="handle" />
        <header className="sheet-head">
          <div>
            <p className="eyebrow">Watchlist</p>
            <h2 id="sheet-title">Symbols</h2>
          </div>
          <button type="button" className="text-btn" onClick={onClose}>
            Done
          </button>
        </header>
        <ul className="symbol-list">
          {SYMBOLS.map((symbol) => {
            const on = picked.includes(symbol.id);
            return (
              <li key={symbol.id}>
                <button
                  type="button"
                  className={on ? "symbol-row on" : "symbol-row"}
                  aria-pressed={on}
                  onClick={() => onToggle(symbol.id)}
                >
                  <span>
                    <strong>{symbol.id}</strong>
                    <em>{symbol.name}</em>
                  </span>
                  <span className="market">{symbol.market}</span>
                  <span className="check" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TabButton({ id, label, current, onSelect, icon }) {
  const selected = current === id;
  return (
    <button
      type="button"
      className={selected ? "tab on" : "tab"}
      aria-current={selected ? "page" : undefined}
      onClick={() => onSelect(id)}
    >
      {icon}
      {label}
    </button>
  );
}

