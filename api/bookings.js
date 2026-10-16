import { handleCreateBooking } from "../lib/handlers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const baseUrl = `${proto}://${host}`;
  // Forward the retry idempotency key so Vercel deployments get the same
  // duplicate-submission protection as the Express route (server.js).
  const idempotencyKey = req.headers["idempotency-key"] || req.headers["Idempotency-Key"] || null;
  try {
    const result = await handleCreateBooking(req.body || {}, baseUrl, idempotencyKey);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[API /bookings] Unhandled error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
}
