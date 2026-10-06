export function scanChart(image) {
  const canvas = document.createElement("canvas");
  const width = 180;
  const height = Math.max(48, Math.round((image.height / image.width) * width));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const points = [];

  for (let x = 0; x < width; x += 1) {
    let bestScore = 0;
    let bestY = 0;
    for (let y = 0; y < height; y += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const score = Math.max(red, green, blue) + Math.abs(red - green) + Math.abs(green - blue);
      if (score > bestScore) {
        bestScore = score;
        bestY = y;
      }
    }
    if (bestScore > 90) points.push([x, bestY]);
  }

  if (points.length < width * 0.35) {
    return { ok: false, reason: "No chart line found. Use a clearer chart image." };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }
  const count = points.length;
  const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX || 1);
  const side = slope <= 0 ? "buy" : "sell";
  const confidence = Math.max(52, Math.min(96, Math.round(Math.abs(slope) * 90 + 55)));
  return { ok: true, side, confidence };
}
