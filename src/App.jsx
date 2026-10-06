import { useEffect, useRef, useState } from "react";
import { SYMBOLS, loadDesk, saveDesk } from "./data.js";
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
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [book, setBook] = useState(() => openSession(saved?.picked ?? ["EURUSD", "XAUUSD"]));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [toast, pushToast, dismissToast] = useToast();

  useEffect(() => {
    saveDesk({ picked, confirmRemove });
  }, [picked, confirmRemove]);

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

  function selectTab(id) {
    setTab(id);
    dismissToast();
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
      <div className="device">
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
              onRemove={requestRemove}
              onStart={toggleRun}
              onOpenSymbols={() => setSheetOpen(true)}
              onRemoveOne={removeOne}
            />
          )}
          {tab === "tape" && <Tape selected={selected} quotes={book} running={running} />}
          {tab === "settings" && (
            <Settings
              confirmRemove={confirmRemove}
              onToggleConfirm={() => setConfirmRemove((value) => !value)}
              symbolCount={picked.length}
              elapsed={elapsed}
              running={running}
            />
          )}
        </main>

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

function Home({ selected, quotes, elapsed, running, onRemove, onStart, onOpenSymbols, onRemoveOne }) {
  return (
    <section className="home">
      <div className="stage-card">
        <div className="stage-top">
          <span className="kicker">Session</span>
          <span className={`live-pill ${running ? "on" : ""}`}>{running ? "Live" : "Idle"}</span>
        </div>
        <Mascot live={running} />
        <h1 className="wordmark">
          edge<em>X</em>
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

function Tape({ selected, quotes, running }) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Markets</p>
          <h2>Tape</h2>
        </div>
        <span className={`live-pill ${running ? "on" : ""}`}>{running ? "Live" : "Idle"}</span>
      </header>
      {selected.length === 0 ? (
        <div className="empty-block">
          <p>No symbols on the tape.</p>
          <p>Add them from Home, then start the session.</p>
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
                    {quote && <b className={`quote ${tone}`}>{formatPrice(symbol.id, quote.price)}</b>}
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
                    stroke={tone === "down" ? "#ff8f86" : "#c8f54a"}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="market">{symbol.market}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Settings({ confirmRemove, onToggleConfirm, symbolCount, elapsed, running }) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Desk</p>
          <h2>Settings</h2>
        </div>
      </header>
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
