import { useRef, useState } from "react";
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
  const [tradeCount, setTradeCount] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [symbol, setSymbol] = useState("");
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
      setSymbol("");
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
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: chartPayload(image) }),
      });
      const result = await response.json().catch(() => null);
      if (!result?.ok) {
        setNotice({ text: result?.reason || "The chart reader did not respond. Try again.", tone: "bad" });
        return;
      }
      setSymbol(result.symbol);
      setScan(result);
    } catch {
      setNotice({ text: "The chart reader did not respond. Try again.", tone: "bad" });
    } finally {
      setScanning(false);
    }
  }

  function execute() {
    if (!scan?.ok || !scan.symbol) return;
    const count = Math.round(Number(tradeCount));
    const lot = Math.round(Number(lotSize) * 100) / 100;
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setNotice({ text: "Enter how many trades.", tone: "bad" });
      return;
    }
    if (!Number.isFinite(lot) || lot < 0.01 || lot > 100) {
      setNotice({ text: "Enter the lot size.", tone: "bad" });
      return;
    }
    if (!mt5.connected) {
      setNotice({ text: "Connect MetaTrader before sending a trade.", tone: "bad" });
      return;
    }
    for (let index = 0; index < count; index += 1) {
      onExecute({
        id: crypto.randomUUID(),
        login: mt5.login,
        server: mt5.server,
        symbol: scan.symbol,
        side: scan.side,
        volume: lot,
        price: null,
        at: Date.now(),
      });
    }
    const sideName = scan.side === "buy" ? "Buy" : "Sell";
    setScan(null);
    setNotice({
      text: `${sideName} ${scan.symbol} ${lot.toFixed(2)} × ${count} on account ${mt5.login}.`,
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

      <button
        type="button"
        className={scanning ? "upload scanning" : "upload"}
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        aria-busy={scanning}
      >
        {preview ? (
          <img src={preview} alt="Uploaded chart" />
        ) : (
          <span>Upload your MetaTrader chart</span>
        )}
        {scanning && (
          <span className="detector" aria-hidden="true">
            <i />
          </span>
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

      <label className="scan-symbol">
        Symbol
        <input readOnly tabIndex={-1} value={symbol} placeholder="From the chart" />
      </label>

      <div className="scan-fields">
        <label>
          Trades
          <input
            inputMode="numeric"
            value={tradeCount}
            onChange={(event) => {
              setTradeCount(event.target.value);
              setNotice(null);
            }}
            placeholder="1"
          />
        </label>
        <label>
          Lot size
          <input
            inputMode="decimal"
            value={lotSize}
            onChange={(event) => {
              setLotSize(event.target.value);
              setNotice(null);
            }}
            placeholder="0.10"
          />
        </label>
      </div>

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
          {scan.symbol} · {scan.side === "buy" ? "Buy" : "Sell"} · {scan.confidence}%
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
              <span>{Number(trade.volume || 0).toFixed(2)}</span>
              <span>{trade.price == null ? "Mkt" : formatPrice(trade.symbol, trade.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
