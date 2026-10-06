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

export const FONTS = ["Outfit", "Manrope", "Space Grotesk", "Sora", "Syne"];

export const WORD_COLORS = [
  { id: "cream", value: "#f4f1ea" },
  { id: "white", value: "#ffffff" },
  { id: "mint", value: "#d6ffe8" },
  { id: "sand", value: "#ffe7c2" },
  { id: "ice", value: "#d7ecff" },
];

export const ACCENTS = [
  { id: "lime", value: "#c8f54a", ink: "#16180d" },
  { id: "cyan", value: "#3ee0ff", ink: "#041316" },
  { id: "amber", value: "#ffb020", ink: "#1a1204" },
  { id: "violet", value: "#c084fc", ink: "#140818" },
  { id: "rose", value: "#ff7a90", ink: "#1a0a0e" },
];

export const DEFAULT_THEME = {
  font: "Outfit",
  word: "#f4f1ea",
  accent: "#c8f54a",
  ink: "#16180d",
};

function readTheme(data) {
  const font = FONTS.includes(data?.font) ? data.font : DEFAULT_THEME.font;
  const word = WORD_COLORS.some((color) => color.value === data?.word)
    ? data.word
    : DEFAULT_THEME.word;
  const accent = ACCENTS.find((color) => color.value === data?.accent) ?? ACCENTS[0];
  return { font, word, accent: accent.value, ink: accent.ink };
}

function readTrades(data) {
  if (!Array.isArray(data?.trades)) return [];
  return data.trades.filter(
    (trade) =>
      trade &&
      typeof trade.id === "string" &&
      typeof trade.login === "string" &&
      typeof trade.symbol === "string" &&
      (trade.side === "buy" || trade.side === "sell")
  );
}

function readMt5(data) {
  const login = typeof data?.mt5?.login === "string" ? data.mt5.login : "";
  const server = typeof data?.mt5?.server === "string" ? data.mt5.server : "";
  return {
    login,
    server,
    connected: Boolean(data?.mt5?.connected) && Boolean(login) && Boolean(server),
  };
}

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
      confirmRemove: data.confirmRemove == null ? true : Boolean(data.confirmRemove),
      theme: readTheme(data),
      mt5: readMt5(data),
      trades: readTrades(data),
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
        font: desk.theme?.font,
        word: desk.theme?.word,
        accent: desk.theme?.accent,
        mt5: {
          login: desk.mt5?.login ?? "",
          server: desk.mt5?.server ?? "",
          connected: Boolean(desk.mt5?.connected),
        },
        trades: desk.trades ?? [],
      })
    );
  } catch {
    // Private mode can block storage; the session still works in memory.
  }
}
