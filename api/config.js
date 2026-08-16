// Expose safe client-side configuration (e.g. Google Maps API Key)
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).json({
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      brandName: process.env.BRAND_NAME || "STB Singapore",
      contactPhone: process.env.CONTACT_PHONE || "+65 9062 9107",
      adminWhatsApp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "+6590629107",
    });
  } catch (err) {
    console.error("[API /config] Error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
}
