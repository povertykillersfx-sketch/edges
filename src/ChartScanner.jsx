import { useRef, useState } from "react";
import { SYMBOLS } from "./data.js";
import { formatPrice } from "./session.js";
import { scanChart } from "./scan.js";

export function ChartScanner({ quotes, mt5, trades, onClose, onExecute, onOpenTape }) {
  const inputRef = useRef(null);
  const previewRef = useRef("");
  const [preview, setPreview] = useState("");
  const [image, setImage] = useState(null);
  const [symbol, setSymbol] = useState(SYMBOLS[0].id);
  const [scan, setScan] = useState(null);
  const [notice, setNotice] = useState(null);

  function chooseFile(file) {
    if (!file) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    const next = new Image();
    next.onload = () => {
      setImage(next);
      setPreview(url);
      setScan(null);
      setNotice(null);
    };
    next.onerror = () => {
      URL.revokeObjectURL(url);
      setNotice({ text: "That file could not be read.", tone: "bad" });
    };
    next.src = url;
  }

  function scanImage() {
    if (!image) {
      setNotice({ text: "Upload a chart image first.", tone: "bad" });
      return;
    }
    const result = scanChart(image);
    setScan(result.ok ? result : null);
    setNotice(result.ok ? null : { text: result.reason, tone: "bad" });
  }

  function execute() {
    if (!scan?.ok) return;
    if (!mt5.connected) {
      setNotice({ text: "Connect MT5 on Tape before sending a trade.", tone: "bad" });
      return;
    }
    const price = quotes[symbol]?.price ?? null;
    onExecute({
      id: crypto.randomUUID(),
      login: mt5.login,
      server: mt5.server,
      symbol,
      side: scan.side,
      volume: 0.1,
      price,
      at: Date.now(),
    });
    setScan(null);
    setNotice({
      text: `${scan.side === "buy" ? "Buy" : "Sell"} ${symbol} 0.10 sent to account ${mt5.login}.`,
      tone: "good",
    });
  }

  const accountTrades = trades.filter((trade) => trade.login === mt5.login);

  return (
    <section className="scanner" aria-labelledby="scanner-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h2 id="scanner-title">Chart scanner</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Back
        </button>
      </header>

      <button type="button" className="upload" onClick={() => inputRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="Uploaded chart" />
        ) : (
          <span>Upload a chart image</span>
        )}
      </button>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          chooseFile(file);
        }}
      />

      <label className="symbol-pick">
        Symbol
        <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
          {SYMBOLS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id}
            </option>
          ))}
        </select>
      </label>

      <div className="scanner-actions">
        <button type="button" className="connect-btn" onClick={scanImage}>
          Scan
        </button>
        <button type="button" className="connect-btn ghost" onClick={execute} disabled={!scan?.ok}>
          Execute trade
        </button>
      </div>

      {scan?.ok && (
        <p className="scan-result">
          {scan.side === "buy" ? "Buy" : "Sell"} {symbol} · {scan.confidence}%
          {quotes[symbol] ? ` · ${formatPrice(symbol, quotes[symbol].price)}` : ""}
        </p>
      )}
      {notice && <p className={notice.tone === "good" ? "scan-note" : "form-error"}>{notice.text}</p>}
      {!mt5.connected && (
        <button type="button" className="text-btn" onClick={onOpenTape}>
          Connect MT5 on Tape
        </button>
      )}

      {accountTrades.length > 0 && (
        <ul className="trade-list">
          {accountTrades.map((trade) => (
            <li key={trade.id}>
              <strong>{trade.side === "buy" ? "Buy" : "Sell"}</strong>
              <span>{trade.symbol}</span>
              <span>{trade.volume.toFixed(2)}</span>
              <span>{trade.price == null ? "Mkt" : formatPrice(trade.symbol, trade.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
