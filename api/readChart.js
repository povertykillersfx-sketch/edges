const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const IMAGE = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i;

export function chartKey() {
  return process.env.open_ai || process.env.OPEN_AI || process.env.OPENAI_API_KEY || "";
}

export function parseChartReply(text) {
  const cleaned = String(text || "")
    .replace(/```json|```/gi, "")
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, reason: "The chart reader could not read that image." };
  }
  if (parsed?.error) {
    const missingSymbol = String(parsed.error).toLowerCase().includes("symbol");
    return {
      ok: false,
      reason: missingSymbol
        ? "The symbol was not visible on that chart."
        : "No chart line found. Use a clearer chart image.",
    };
  }
  const side = parsed?.side === "sell" ? "sell" : parsed?.side === "buy" ? "buy" : "";
  const symbol = String(parsed?.symbol || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  if (!side || !symbol) {
    return {
      ok: false,
      reason: side ? "The symbol was not visible on that chart." : "No chart line found. Use a clearer chart image.",
    };
  }
  const confidence = Math.max(50, Math.min(96, Math.round(Number(parsed.confidence) || 60)));
  return { ok: true, side, confidence, symbol };
}

export async function readChart({ image, apiKey, fetchImpl = fetch }) {
  if (!apiKey) return { ok: false, reason: "The chart reader is not connected yet." };
  if (typeof image !== "string" || !IMAGE.test(image) || image.length > 2_000_000) {
    return { ok: false, reason: "Use a clearer chart image." };
  }
  let response;
  try {
    response = await fetchImpl(OPENAI_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You read a real trading chart screenshot. Reply with JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Read this trading chart screenshot. Copy the symbol printed on the chart, such as EURUSD or XAUUSD. Use only what is visible. Reply {"symbol":"EURUSD","side":"buy","confidence":70} when the right side is rising, or "sell" when it is falling. confidence is from 50 to 96. If the symbol is not visible, reply {"error":"no symbol"}. If it is not a price chart, reply {"error":"not a chart"}.`,
              },
              { type: "image_url", image_url: { url: image, detail: "high" } },
            ],
          },
        ],
      }),
    });
  } catch {
    return { ok: false, reason: "The chart reader did not respond. Try again." };
  }
  if (!response.ok) {
    if (response.status === 401) return { ok: false, reason: "The chart reader key was rejected." };
    if (response.status === 429) return { ok: false, reason: "The chart reader is busy. Try again." };
    return { ok: false, reason: "The chart reader did not respond. Try again." };
  }
  const payload = await response.json();
  return parseChartReply(payload?.choices?.[0]?.message?.content || "");
}
