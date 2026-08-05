import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { guestEmail, adminEmail, guestText, adminText } from "./emails/templates.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/src", express.static(path.join(__dirname, "src")));
app.use(express.static(__dirname));

// ============================================
// SMTP transporter
// ============================================
const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

if (transporter) {
  transporter.verify((err) => {
    if (err) console.error("[SMTP] verify failed:", err.message);
    else console.log("[SMTP] ready to send via", process.env.SMTP_HOST);
  });
} else {
  console.warn("[SMTP] not configured — bookings will log to console only.");
}

const brand = {
  name: process.env.BRAND_NAME || "STB Singapore",
  tagline: process.env.BRAND_TAGLINE || "Majestic Hospitality Since 2014",
  logoUrl: process.env.LOGO_URL || "",
  phone: process.env.CONTACT_PHONE || "+65 9123 4567",
  email: process.env.CONTACT_EMAIL || "admin@singaporetourbooking.com",
  whatsapp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "+65 9123 4567",
  site: process.env.SITE_URL || "https://stb-singapore.com",
};

// ============================================
// Health
// ============================================
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "STB Singapore", smtp: smtpConfigured });
});

// ============================================
// Bookings
// ============================================
const bookings = [];

app.post("/api/bookings", async (req, res) => {
  const {
    voucherCode, passengerName, passengerEmail, passengerPhone,
    vehicle, pickup, destination, dateTime, flightNo,
    fare, currency, paymentMethod, pax,
  } = req.body || {};

  if (!passengerName || !passengerEmail || !passengerPhone) {
    return res.status(400).json({ error: "Passenger name, email, and phone are required." });
  }

  const booking = {
    id: voucherCode || `STB-${Date.now()}`,
    voucherCode: voucherCode || `STB-${Date.now()}`,
    passengerName, passengerEmail, passengerPhone,
    vehicle, pickup, destination, dateTime, flightNo,
    fare, currency, paymentMethod, pax,
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);

  // WhatsApp deep-link for confirmation modal
  const adminWa = (process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "").replace(/[^0-9]/g, "");
  let waText = `*STB Singapore — VIP Chauffeur Reservation*\n\n`;
  waText += `🎟 *Voucher:* ${booking.voucherCode}\n`;
  waText += `👤 *Passenger:* ${passengerName}\n`;
  waText += `🚘 *Vehicle:* ${vehicle}\n`;
  waText += `📍 *Pickup:* ${pickup}\n`;
  if (destination) waText += `🏁 *Destination:* ${destination}\n`;
  waText += `📅 *Date & Time:* ${dateTime || "Flexible"}\n`;
  if (flightNo) waText += `✈️ *Flight:* ${flightNo}\n`;
  waText += `💰 *Fare:* ${fare} (${currency})\n`;
  waText += `💳 *Payment:* ${paymentMethod}\n`;
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${adminWa}&text=${encodeURIComponent(waText)}`;

  // ============================================
  // Send emails
  // ============================================
  const emailResult = { customer: null, admin: null };

  if (transporter) {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const fromHeader = `"${brand.name}" <${fromAddress}>`;

    try {
      const info = await transporter.sendMail({
        from: fromHeader,
        replyTo: brand.email,
        to: passengerEmail,
        subject: `Your STB Reservation is Confirmed — ${booking.voucherCode}`,
        html: guestEmail(booking, brand),
        text: guestText(booking),
      });
      emailResult.customer = { ok: true, id: info.messageId };
      console.log("[EMAIL] Guest confirmation sent:", info.messageId, "→", passengerEmail);
    } catch (err) {
      emailResult.customer = { ok: false, error: err.message };
      console.error("[EMAIL] Guest failed:", err.message);
    }

    try {
      const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
      const info = await transporter.sendMail({
        from: fromHeader,
        replyTo: passengerEmail,
        to: adminTo,
        subject: `[NEW BOOKING] ${booking.voucherCode} — ${passengerName}`,
        html: adminEmail(booking, brand),
        text: adminText(booking),
      });
      emailResult.admin = { ok: true, id: info.messageId };
      console.log("[EMAIL] Admin alert sent:", info.messageId, "→", adminTo);
    } catch (err) {
      emailResult.admin = { ok: false, error: err.message };
      console.error("[EMAIL] Admin failed:", err.message);
    }
  } else {
    console.log("[EMAIL] SMTP not configured. Booking:", booking.voucherCode);
  }

  res.json({
    success: true,
    message: "Booking confirmed.",
    booking,
    emailsSent: emailResult,
    whatsappUrl,
  });
});

// ============================================
// SPA fallback
// ============================================
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`STB Singapore Server listening on http://0.0.0.0:${PORT}`);
});
