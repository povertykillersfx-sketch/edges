export const SYMBOLS = [
  { id: "EURUSD", name: "Euro / US Dollar", market: "FX" },
  { id: "GBPUSD", name: "Pound / US Dollar", market: "FX" },
  { id: "USDJPY", name: "US Dollar / Yen", market: "FX" },
  { id: "XAUUSD", name: "Gold", market: "Metal" },
  { id: "NAS100", name: "Nasdaq 100", market: "Index" },
  { id: "US30", name: "Wall Street 30", market: "Index" },
  { id: "BTCUSD", name: "Bitcoin", market: "Crypto" },
  { id: "ETHUSD", name: "Ether", market: "Crypto" },
];

const KNOWN = new Set(SYMBOLS.map((symbol) => symbol.id));
const STORE_KEY = "edgex.desk.v1";

export function loadDesk() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const picked = Array.isArray(data.picked)
      ? data.picked.filter((id) => KNOWN.has(id))
      : null;
    return {
      picked,
      confirmRemove: Boolean(data.confirmRemove),
    };
  } catch {
    return null;
  }
}

export function saveDesk(desk) {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        picked: desk.picked,
        confirmRemove: desk.confirmRemove,
      })
    );
  } catch {
    // Private mode can block storage; the session still works in memory.
  }
}
