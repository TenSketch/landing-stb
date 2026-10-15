// Expose safe client-side configuration (e.g. Google Maps API Key)
import { getBrowserMapsApiKey } from "../lib/googleMapsConfig.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).json({
      // Browser-safe selector only: returns GOOGLE_MAPS_BROWSER_API_KEY /
      // NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and never the server-only key.
      googleMapsApiKey: getBrowserMapsApiKey(),
      brandName: process.env.BRAND_NAME || "STB Singapore",
      contactPhone: process.env.CONTACT_PHONE || "+65 9062 9107",
      adminWhatsApp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "+659****9107",
    });
  } catch (err) {
    console.error("[API /config] Error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
}
