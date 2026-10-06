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

export function sparkline(seed, width = 112, height = 36) {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  const values = [];
  for (let i = 0; i < 16; i += 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822519);
    values.push((state >>> 0) / 4294967295);
  }
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 4 - value * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
