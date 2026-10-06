import { formatElapsed, formatPrice } from "./session.js";

export function Portal({
  mt5,
  trades,
  selected,
  running,
  elapsed,
  onClose,
  onOpenTape,
  onClearTrades,
}) {
  const accountTrades = mt5.connected ? trades.filter((trade) => trade.login === mt5.login) : [];

  return (
    <section className="portal" aria-labelledby="portal-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">Hidden</p>
          <h2 id="portal-title">Portal</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </header>

      <article className="portal-card">
        <div className="portal-card-top">
          <div>
            <p className="setting-title">{mt5.connected ? `Account ${mt5.login}` : "No account yet"}</p>
            <p className="setting-copy">
              {mt5.connected ? mt5.server : "Connect MT5 on Tape. Trades from the chart scanner land here."}
            </p>
          </div>
          <span className={`live-pill ${mt5.connected ? "on" : ""}`}>
            {mt5.connected ? "Connected" : "Offline"}
          </span>
        </div>
      </article>

      <dl className="portal-stats">
        <div>
          <dt>Session</dt>
          <dd>{running ? formatElapsed(elapsed) : "Idle"}</dd>
        </div>
        <div>
          <dt>Symbols</dt>
          <dd>{selected.length}</dd>
        </div>
        <div>
          <dt>Trades</dt>
          <dd>{accountTrades.length}</dd>
        </div>
      </dl>

      <p className="portal-label">Armed</p>
      {selected.length === 0 ? (
        <p className="setting-copy">No symbols in this session.</p>
      ) : (
        <ul className="portal-symbols">
          {selected.map((symbol) => (
            <li key={symbol.id}>{symbol.id}</li>
          ))}
        </ul>
      )}

      <p className="portal-label">Sent on this account</p>
      {accountTrades.length === 0 ? (
        <p className="setting-copy">No chart trades yet.</p>
      ) : (
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

      <div className="portal-actions">
        {!mt5.connected && (
          <button type="button" className="connect-btn" onClick={onOpenTape}>
            Connect MT5
          </button>
        )}
        {accountTrades.length > 0 && (
          <button type="button" className="connect-btn ghost" onClick={onClearTrades}>
            Clear trades
          </button>
        )}
      </div>
    </section>
  );
}
