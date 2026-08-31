import { handleEstimateFare } from "../lib/handlers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const referer = req.headers.referer || "https://singaporetourbooking.com/";
    const result = await handleEstimateFare(req.body || {}, referer);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[API /estimate] Unhandled error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
}
