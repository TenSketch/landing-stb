// Local dev server — wraps the same handlers used by Vercel /api/* functions.
// Not used in production. On Vercel, /api/* files are serverless functions.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  handleCreateBooking, handleGetAssign, handlePostAssign, handleRemindersCron,
  getTransporter,
} from "./lib/handlers.js";
import { storageMode } from "./lib/store.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets — mirror how Vercel serves them (everything at root, /src, /public)
app.use(express.static(__dirname, { index: false, extensions: ["html"] }));

// ---------- Warm SMTP + log ----------
const transporter = getTransporter();
if (transporter) {
  transporter.verify((err) => {
    if (err) console.error("[SMTP] verify failed:", err.message);
    else console.log("[SMTP] ready to send via", process.env.SMTP_HOST);
  });
} else {
  console.warn("[SMTP] not configured — bookings will log to console only.");
}
console.log("[STORAGE]", storageMode);

// ---------- Health ----------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "STB Singapore",
    smtp: Boolean(transporter),
    storage: storageMode,
    node: process.version,
  });
});

// ---------- Bookings ----------
app.post("/api/bookings", async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const r = await handleCreateBooking(req.body || {}, baseUrl);
  res.status(r.status).json(r.body);
});

// ---------- Assign (GET form, POST save) ----------
app.get("/assign", (_req, res) => {
  res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><title>STB Assign</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:auto;color:#141414;background:#FBF7F0;}</style></head>
    <body><h1>STB Dispatch</h1><p>Open your booking-alert email and click <strong>Assign Driver</strong> — the link includes the voucher code.</p></body></html>`);
});

app.get("/assign/:voucherCode", async (req, res) => {
  const r = await handleGetAssign(req.params.voucherCode);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(r.status).send(r.html);
});

app.post("/assign/:voucherCode", async (req, res) => {
  const r = await handlePostAssign(req.params.voucherCode, req.body || {});
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(r.status).send(r.html);
});

// ---------- Manual cron trigger (dev only) ----------
app.get("/api/cron/reminders", async (_req, res) => {
  const r = await handleRemindersCron();
  res.status(r.status).json(r.body);
});

// ---------- Local-dev cron loop (Vercel Cron replaces this in prod) ----------
setInterval(() => { handleRemindersCron().catch(() => {}); }, 60 * 1000);
setTimeout(() => { handleRemindersCron().catch(() => {}); }, 8 * 1000);

// ---------- SPA-ish fallback ----------
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`STB Singapore local dev server on http://0.0.0.0:${PORT}`);
});
