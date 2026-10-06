const QUOTES = {
  EURUSD: { price: 1.0864, step: 0.0008, digits: 4 },
  GBPUSD: { price: 1.2715, step: 0.001, digits: 4 },
  USDJPY: { price: 151.42, step: 0.08, digits: 2 },
  XAUUSD: { price: 2648.3, step: 1.2, digits: 2 },
  NAS100: { price: 20142, step: 8, digits: 1 },
  US30: { price: 42318, step: 12, digits: 1 },
  BTCUSD: { price: 67240, step: 45, digits: 0 },
  ETHUSD: { price: 3248, step: 3.5, digits: 2 },
};

function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatPrice(id, value) {
  const digits = QUOTES[id]?.digits ?? 2;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function direction(row) {
  if (!row) return "flat";
  if (row.price > row.open) return "up";
  if (row.price < row.open) return "down";
  return "flat";
}

export function changeLabel(row) {
  if (!row) return "0.00%";
  const pct = ((row.price - row.open) / row.open) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function openSession(ids) {
  const book = {};
  for (const id of ids) {
    const price = QUOTES[id]?.price;
    if (price == null) continue;
    book[id] = { price, open: price, points: Array(16).fill(price) };
  }
  return book;
}

export function syncBook(book, ids) {
  const next = {};
  for (const id of ids) {
    if (book[id]) {
      next[id] = book[id];
      continue;
    }
    const price = QUOTES[id]?.price;
    if (price == null) continue;
    next[id] = { price, open: price, points: Array(16).fill(price) };
  }
  return next;
}

export function tickBook(book) {
  const next = {};
  for (const [id, row] of Object.entries(book)) {
    const spec = QUOTES[id];
    if (!spec) continue;
    const way = Math.random() < 0.5 ? -1 : 1;
    const magnitude = spec.step * (0.45 + Math.random() * 0.7);
    let price = roundTo(Math.max(row.price + way * magnitude, spec.step), spec.digits);
    if (price === row.price) {
      price = roundTo(row.price + way * 10 ** -spec.digits, spec.digits);
    }
    next[id] = { ...row, price, points: [...row.points.slice(1), price] };
  }
  return next;
}

export function toPolyline(points, width = 112, height = 36) {
  if (!points?.length) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || Math.abs(min) * 0.002 || 1;
  return points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - 4 - ((value - min) / span) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
