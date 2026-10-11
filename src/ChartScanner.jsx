import { useRef, useState } from "react";
import { SYMBOLS } from "./data.js";
import { formatPrice } from "./session.js";

function chartPayload(image) {
  const max = 1024;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function ChartScanner({ mt5, trades, onClose, onExecute, embedded = false, showTitle = true }) {
  const inputRef = useRef(null);
  const previewRef = useRef("");
  const [preview, setPreview] = useState("");
  const [image, setImage] = useState(null);
  const [symbol, setSymbol] = useState(SYMBOLS[0].id);
  const [scan, setScan] = useState(null);
  const [notice, setNotice] = useState(null);
  const [scanning, setScanning] = useState(false);

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

  async function scanImage() {
    if (!image) {
      setNotice({ text: "Upload a chart image first.", tone: "bad" });
      return;
    }
    setScanning(true);
    setScan(null);
    setNotice(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: chartPayload(image), symbol }),
      });
      const result = await response.json().catch(() => null);
      if (!result?.ok) {
        setNotice({ text: result?.reason || "The chart reader did not respond. Try again.", tone: "bad" });
        return;
      }
      setScan(result);
    } catch {
      setNotice({ text: "The chart reader did not respond. Try again.", tone: "bad" });
    } finally {
      setScanning(false);
    }
  }

  function execute() {
    if (!scan?.ok) return;
    if (!mt5.connected) {
      setNotice({ text: "Connect MetaTrader before sending a trade.", tone: "bad" });
      return;
    }
    onExecute({
      id: crypto.randomUUID(),
      login: mt5.login,
      server: mt5.server,
      symbol,
      side: scan.side,
      volume: 0.1,
      price: null,
      at: Date.now(),
    });
    setScan(null);
    setNotice({
      text: `${scan.side === "buy" ? "Buy" : "Sell"} ${symbol} 0.10 on account ${mt5.login}.`,
      tone: "good",
    });
  }

  const accountTrades = trades.filter((trade) => trade.login === mt5.login);

  return (
    <section className={embedded ? "scanner embedded" : "scanner"} aria-labelledby="scanner-title">
      {embedded ? (
        showTitle && (
          <h2 id="scanner-title" className="scanner-title">
            Chart scanner
          </h2>
        )
      ) : (
        <header className="page-head">
          <div>
            <p className="eyebrow">MetaTrader</p>
            <h2 id="scanner-title">Chart scanner</h2>
          </div>
          <button type="button" className="text-btn" onClick={onClose}>
            Back
          </button>
        </header>
      )}

      <button type="button" className="upload" onClick={() => inputRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="Uploaded chart" />
        ) : (
          <span>Upload your MetaTrader chart</span>
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
        <button type="button" className="connect-btn" onClick={scanImage} disabled={scanning}>
          {scanning ? "Reading" : "Scan"}
        </button>
        <button type="button" className="connect-btn ghost" onClick={execute} disabled={!scan?.ok}>
          Execute trade
        </button>
      </div>

      {scan?.ok && (
        <p className="scan-result">
          {scan.side === "buy" ? "Buy" : "Sell"} {symbol} · {scan.confidence}%
        </p>
      )}
      {notice && <p className={notice.tone === "good" ? "scan-note" : "form-error"}>{notice.text}</p>}
      {!mt5.connected && (
        <p className="setting-copy">Connect MetaTrader before sending a trade.</p>
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
