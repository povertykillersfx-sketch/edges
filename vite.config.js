import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { chartKey, readChart } from "./api/readChart.js";

function scanApi() {
  return {
    name: "scan-api",
    configureServer(server) {
      server.middlewares.use("/api/scan", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, reason: "Upload a chart image." }));
          return;
        }
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
            const result = await readChart({ image: body.image, symbol: body.symbol, apiKey: chartKey() });
            res.statusCode = result.ok ? 200 : 422;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(result));
          } catch {
            res.statusCode = 502;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: false, reason: "The chart reader did not respond. Try again." }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), scanApi()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [".trycloudflare.com"],
  },
});
