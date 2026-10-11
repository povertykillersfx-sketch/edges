import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { chartKey, readChart } from "./api/readChart.js";
import { searchBrokers } from "./api/brokers.js";
import { brokerBase, brokerToken, connectBroker, stopBroker } from "./api/mt5.js";

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

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
            const result = await readChart({ image: body.image, apiKey: chartKey() });
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

function brokerApi() {
  return {
    name: "broker-api",
    configureServer(server) {
      server.middlewares.use("/api/brokers", async (req, res) => {
        if (req.method !== "GET") {
          sendJson(res, 405, { ok: false, reason: "Type a broker name." });
          return;
        }
        const query = new URL(req.url || "/", "http://desk.local").searchParams.get("q") || "";
        try {
          const result = await searchBrokers(query);
          sendJson(res, result.ok ? 200 : 422, result);
        } catch {
          sendJson(res, 502, { ok: false, reason: "The broker search did not respond." });
        }
      });
      server.middlewares.use("/api/mt5", async (req, res) => {
        try {
          if (req.method === "POST") {
            const body = await readJsonBody(req);
            const result = await connectBroker({
              login: body.login,
              password: body.password,
              server: body.server,
              token: brokerToken(),
              base: brokerBase(),
            });
            sendJson(res, result.ok ? 200 : 422, result);
            return;
          }
          if (req.method === "DELETE") {
            const body = await readJsonBody(req);
            await stopBroker({ id: body.id, token: brokerToken(), base: brokerBase() });
            sendJson(res, 200, { ok: true });
            return;
          }
          sendJson(res, 405, { ok: false, reason: "Enter the MetaTrader account number and password." });
        } catch {
          sendJson(res, 502, { ok: false, reason: "The broker server did not respond. Try again." });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), scanApi(), brokerApi()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [".trycloudflare.com"],
  },
});
