import { useEffect, useRef, useState } from "react";
import { ACCENTS, EMPTY_PORTAL, FONTS, SYMBOLS, WORD_COLORS, loadDesk, saveDesk } from "./data.js";
import {
  changeLabel,
  direction,
  formatElapsed,
  formatPrice,
  openSession,
  syncBook,
  tickBook,
  toPolyline,
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
import { Portal } from "./Portal.jsx";
import { Mascot } from "./Mascot.jsx";

const saved = loadDesk();

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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
  const time = useClock();
  const [tab, setTab] = useState("home");
  const [picked, setPicked] = useState(saved?.picked ?? ["EURUSD", "XAUUSD"]);
  const [confirmRemove, setConfirmRemove] = useState(saved?.confirmRemove ?? true);
  const [theme, setTheme] = useState(
    saved?.theme ?? { font: "Outfit", word: "#f4f1ea", accent: "#c8f54a", ink: "#16180d" }
  );
  const [mt5, setMt5] = useState(saved?.mt5 ?? { login: "", server: "", connected: false });
  const [trades, setTrades] = useState(saved?.trades ?? []);
  const [portal, setPortal] = useState(saved?.portal ?? EMPTY_PORTAL);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const settingsTaps = useRef([]);
  const [mt5Password, setMt5Password] = useState("");
  const [mt5Phase, setMt5Phase] = useState("idle");
  const [mt5Error, setMt5Error] = useState("");
  const connectTimer = useRef(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [book, setBook] = useState(() => openSession(saved?.picked ?? ["EURUSD", "XAUUSD"]));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [toast, pushToast, dismissToast] = useToast();

  useEffect(() => {
    saveDesk({ picked, confirmRemove, theme, mt5, trades, portal });
  }, [picked, confirmRemove, theme, mt5, trades, portal]);

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
      setPendingRemove(false);
      setScannerOpen(false);
      setPortalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    if (picked.length === 0) {
      pushToast("No symbols to remove");
      return;
    }
    if (confirmRemove) {
      setPendingRemove(true);
      return;
    }
    clearSymbols();
  }

  function clearSymbols() {
    const count = picked.length;
    setPicked([]);
    setRunning(false);
    setPendingRemove(false);
    pushToast(count === 1 ? "1 symbol removed" : `${count} symbols removed`);
  }

  function connectMt5() {
    const login = mt5.login.trim();
    const server = mt5.server.trim();
    if (!/^\d{3,}$/.test(login) || !mt5Password || server.length < 3) {
      setMt5Phase("error");
      setMt5Error("Enter the MT5 account number, password, and server.");
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

  function noteSettingsTap() {
    const now = performance.now();
    const recent = settingsTaps.current.filter((time) => now - time < 700);
    recent.push(now);
    settingsTaps.current = recent;
    if (recent.length < 3) return;
    settingsTaps.current = [];
    setSheetOpen(false);
    setScannerOpen(false);
    setPendingRemove(false);
    setPortalOpen(true);
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
        <header className="status">
          <span className="time">{time}</span>
          <span className="island" />
          <span className="glyphs" aria-hidden="true">
            <Signal />
            <Battery />
          </span>
        </header>

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
              selected={selected}
              quotes={book}
              running={running}
              mt5={mt5}
              password={mt5Password}
              phase={mt5Phase}
              error={mt5Error}
              onChange={(patch) => setMt5((current) => ({ ...current, ...patch }))}
              onPassword={setMt5Password}
              onConnect={connectMt5}
              onDisconnect={disconnectMt5}
            />
          )}
          {tab === "settings" && (
            <Settings
              confirmRemove={confirmRemove}
              onToggleConfirm={() => setConfirmRemove((value) => !value)}
              symbolCount={picked.length}
              elapsed={elapsed}
              running={running}
              theme={theme}
              onTheme={(patch) => setTheme((current) => ({ ...current, ...patch }))}
              onOpenScanner={() => setScannerOpen(true)}
              onSecretTap={noteSettingsTap}
            />
          )}
        </main>

        {portalOpen && (
          <Portal
            portal={portal}
            onChange={setPortal}
            onClose={() => setPortalOpen(false)}
          />
        )}

        {scannerOpen && (
          <ChartScanner
            quotes={book}
            mt5={mt5}
            trades={trades}
            onClose={() => setScannerOpen(false)}
            onOpenTape={() => {
              setScannerOpen(false);
              setTab("tape");
            }}
            onExecute={(trade) => setTrades((current) => [trade, ...current])}
          />
        )}

        {sheetOpen && (
          <SymbolSheet
            picked={picked}
            onToggle={toggleSymbol}
            onClose={() => setSheetOpen(false)}
          />
        )}

        {pendingRemove && (
          <div className="scrim" onClick={() => setPendingRemove(false)}>
            <div
              className="confirm"
              role="alertdialog"
              aria-labelledby="confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p id="confirm-title">
                Remove {picked.length} symbol{picked.length === 1 ? "" : "s"} from this session?
              </p>
              <div className="confirm-actions">
                <button type="button" onClick={() => setPendingRemove(false)}>
                  Keep
                </button>
                <button type="button" className="danger" onClick={clearSymbols}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && !pendingRemove && (
          <p className="toast" role="status">
            {toast}
          </p>
        )}

        <nav className="tabbar" aria-label="Primary">
          <TabButton id="home" label="Home" current={tab} onSelect={selectTab} icon={<IconHome />} />
          <TabButton id="tape" label="Tape" current={tab} onSelect={selectTab} icon={<IconTape />} />
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
  selected,
  quotes,
  running,
  mt5,
  password,
  phase,
  error,
  onChange,
  onPassword,
  onConnect,
  onDisconnect,
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Connect</p>
          <h2>MT5</h2>
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
              placeholder="MT5 password"
            />
          </label>
          <label>
            Server
            <input
              autoComplete="off"
              value={mt5.server}
              onChange={(event) => onChange({ server: event.target.value })}
              placeholder="Broker-Demo"
            />
          </label>
          {error && phase === "error" && <p className="form-error">{error}</p>}
          <button type="submit" className="connect-btn" disabled={phase === "connecting"}>
            {phase === "connecting" ? "Connecting" : "Connect MT5"}
          </button>
        </form>
      )}

      {mt5.connected &&
        (selected.length === 0 ? (
          <div className="empty-block">
            <p>MT5 is connected.</p>
            <p>Add symbols on Home, then start the session to fill the tape.</p>
          </div>
        ) : (
          <ul className="tape-list">
            {selected.map((symbol) => {
              const quote = quotes[symbol.id];
              const tone = direction(quote);
              return (
                <li key={symbol.id} className="tape-card">
                  <div className="symbol-block">
                    <p className="symbol-id">
                      {symbol.id}
                      {quote && (
                        <b className={`quote ${tone}`}>{formatPrice(symbol.id, quote.price)}</b>
                      )}
                    </p>
                    <p className="symbol-name">
                      {symbol.name}
                      {quote && <span className={`quote ${tone}`}> {changeLabel(quote)}</span>}
                    </p>
                  </div>
                  <svg className="spark" viewBox="0 0 112 36" aria-hidden="true">
                    <polyline
                      points={toPolyline(quote?.points)}
                      fill="none"
                      stroke={tone === "down" ? "#ff8f86" : "var(--lime)"}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="market">{running ? "Live" : symbol.market}</span>
                </li>
              );
            })}
          </ul>
        ))}
    </section>
  );
}

function Settings({
  confirmRemove,
  onToggleConfirm,
  symbolCount,
  elapsed,
  running,
  theme,
  onTheme,
  onOpenScanner,
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
      <button type="button" className="setting-link" onClick={onOpenScanner}>
        <span>
          <p className="setting-title">Chart scanner</p>
          <p className="setting-copy">Upload a chart. The scan sends the trade to the connected MT5 account.</p>
        </span>
        <span aria-hidden="true">›</span>
      </button>
      <section className="setting-block">
        <p className="setting-title">Font</p>
        <p className="setting-copy">Changes the words across edgeX, including Tape.</p>
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
        edgeX watches the tape
      </p>
      <ul className="settings-list">
        <li>
          <div>
            <p className="setting-title">Ask before remove</p>
            <p className="setting-copy">Confirm before clearing every symbol.</p>
          </div>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={confirmRemove}
            onClick={onToggleConfirm}
          >
            <i />
            <span className="sr-only">Ask before remove</span>
          </button>
        </li>
      </ul>
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
        edgeX keeps the symbols you choose in one session. Start watches them. Remove clears the
        list.
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

function Signal() {
  return (
    <svg viewBox="0 0 18 12" className="glyph">
      <rect x="0" y="7" width="3" height="5" rx="0.6" />
      <rect x="5" y="4" width="3" height="8" rx="0.6" />
      <rect x="10" y="1.5" width="3" height="10.5" rx="0.6" />
      <rect x="15" y="0" width="3" height="12" rx="0.6" opacity="0.35" />
    </svg>
  );
}

function Battery() {
  return (
    <svg viewBox="0 0 26 12" className="glyph battery">
      <rect x="0.6" y="0.6" width="21" height="10.8" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2.4" y="2.3" width="15" height="7.4" rx="1" />
      <rect x="23" y="3.6" width="2" height="4.8" rx="0.6" />
    </svg>
  );
}
