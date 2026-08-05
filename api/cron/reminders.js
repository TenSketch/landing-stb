import { handleRemindersCron } from "../../lib/handlers.js";

// Called by Vercel Cron (see vercel.json)
export default async function handler(req, res) {
  // Vercel Cron adds an Authorization header with the CRON_SECRET
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  const result = await handleRemindersCron();
  res.status(result.status).json(result.body);
}
