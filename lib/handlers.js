// Shared handlers used by both Vercel /api/* functions AND local Express server.js
import nodemailer from "nodemailer";
import {
  guestEmail, adminEmail, reminderEmail,
  guestText, adminText, reminderText,
} from "../emails/templates.js";
import { saveBooking, getBooking, updateBooking, listAllBookings } from "./store.js";

// ---------- SMTP transporter (singleton) ----------
let _transporter = null;
export function getTransporter() {
  if (_transporter !== null) return _transporter;
  const ok = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  );
  if (!ok) {
    _transporter = false;
    return null;
  }
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return _transporter;
}

// ---------- Brand config from env ----------
export function makeBrand(baseUrl) {
  return {
    name: process.env.BRAND_NAME || "STB Singapore",
    tagline: process.env.BRAND_TAGLINE || "Majestic Hospitality Since 2014",
    logoUrl: process.env.LOGO_URL || "",
    phone: process.env.CONTACT_PHONE || "+65 9062 9107",
    email: process.env.CONTACT_EMAIL || "bala@tensketch.com",
    whatsapp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "+6590629107",
    site: process.env.SITE_URL || baseUrl || "https://singaporetourbooking.com",
    assignUrl: baseUrl ? `${baseUrl}/assign` : "",
  };
}

// ============================================
// CREATE BOOKING
// ============================================
export async function handleCreateBooking(payload, baseUrl) {
  const {
    voucherCode, passengerName, passengerEmail, passengerPhone,
    vehicle, pickup, destination, dateTime, flightNo,
    fare, currency, paymentMethod, pax,
  } = payload || {};

  if (!passengerName || !passengerEmail || !passengerPhone) {
    return { status: 400, body: { error: "Passenger name, email, and phone are required." } };
  }

  const booking = {
    id: voucherCode || `STB-${Date.now()}`,
    voucherCode: voucherCode || `STB-${Date.now()}`,
    passengerName, passengerEmail, passengerPhone,
    vehicle, pickup, destination, dateTime, flightNo,
    fare, currency, paymentMethod, pax,
    driverName: null, driverPhone: null, driverPlate: null, driverPhotoUrl: null,
    reminderSentAt: null,
    createdAt: new Date().toISOString(),
  };

  await saveBooking(booking);

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

  const emailResult = { customer: null, admin: null };
  const transporter = getTransporter();
  if (transporter) {
    const brand = makeBrand(baseUrl);
    const adminBrand = { ...brand, assignUrl: `${baseUrl}/assign/${encodeURIComponent(booking.voucherCode)}` };
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const fromHeader = `"${brand.name}" <${fromAddress}>`;

    try {
      const info = await transporter.sendMail({
        from: fromHeader, replyTo: brand.email, to: passengerEmail,
        subject: `STB Booking Request Received — ${booking.voucherCode}`,
        html: guestEmail(booking, brand), text: guestText(booking),
      });
      emailResult.customer = { ok: true, id: info.messageId };
    } catch (err) {
      emailResult.customer = { ok: false, error: err.message };
      console.error("[EMAIL] Guest failed:", err.message);
    }

    try {
      const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
      const info = await transporter.sendMail({
        from: fromHeader, replyTo: passengerEmail, to: adminTo,
        subject: `NEW TRANSPORT BOOKING — ${booking.voucherCode}`,
        html: adminEmail(booking, adminBrand), text: adminText(booking),
      });
      emailResult.admin = { ok: true, id: info.messageId };
    } catch (err) {
      emailResult.admin = { ok: false, error: err.message };
      console.error("[EMAIL] Admin failed:", err.message);
    }
  }

  return { status: 200, body: { success: true, message: "Booking confirmed.", booking, emailsSent: emailResult, whatsappUrl } };
}

// ============================================
// ASSIGN DRIVER
// ============================================
export async function handleGetAssign(voucherCode) {
  const booking = await getBooking(voucherCode);
  return {
    status: booking ? 200 : 404,
    html: renderAssignPage({ booking, ok: Boolean(booking?.driverName) }),
  };
}

export async function handlePostAssign(voucherCode, body, baseUrl) {
  const { driverName, driverPhone, driverPlate, driverPhotoUrl } = body || {};
  const updated = await updateBooking(voucherCode, {
    driverName: (driverName || "").trim() || null,
    driverPhone: (driverPhone || "").trim() || null,
    driverPlate: (driverPlate || "").trim().toUpperCase() || null,
    driverPhotoUrl: (driverPhotoUrl || "").trim() || null,
    driverAssignedAt: new Date().toISOString(),
  });

  let message = "";
  if (updated) {
    // Fire the "chauffeur assigned" email to the guest right now (no cron needed).
    const transporter = getTransporter();
    if (transporter && updated.passengerEmail && updated.driverName && updated.driverPlate) {
      try {
        const brand = makeBrand(baseUrl);
        const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
        const info = await transporter.sendMail({
          from: `"${brand.name}" <${fromAddress}>`,
          replyTo: brand.email,
          to: updated.passengerEmail,
          subject: `✓ Your chauffeur is assigned — ${updated.voucherCode}`,
          html: reminderEmail(updated, brand),
          text: reminderText(updated),
        });
        await updateBooking(voucherCode, {
          reminderSentAt: new Date().toISOString(),
          reminderMessageId: info.messageId,
        });
        message = `✓ Saved. Chauffeur details emailed to ${updated.passengerEmail}.`;
        console.log("[NOTIFY] Chauffeur email sent for", voucherCode, "→", updated.passengerEmail);
      } catch (err) {
        message = `✓ Saved, but email to guest failed: ${err.message}`;
        console.error("[NOTIFY] Email failed for", voucherCode, err.message);
      }
    } else {
      message = "✓ Saved.";
    }
  }
  return {
    status: updated ? 200 : 404,
    html: renderAssignPage({ booking: updated, message, ok: true }),
  };
}

function renderAssignPage({ booking, message = "", ok = false }) {
  const brand = {
    name: process.env.BRAND_NAME || "STB Singapore",
    logoUrl: process.env.LOGO_URL || "",
  };

  if (!booking) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Not Found</title>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
    <style>body{font-family:'Manrope',sans-serif;background:#FBF7F0;margin:0;padding:60px 20px;display:flex;justify-content:center;color:#141414;}
    .box{max-width:440px;background:#fff;padding:40px;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,0.06);text-align:center;}
    h1{font-family:'Fraunces',serif;font-weight:500;letter-spacing:-0.02em;color:#E31E24;}</style></head>
    <body><div class="box"><h1>Booking not found</h1><p style="color:#6B6B6B;">The voucher code doesn't match any reservation.</p></div></body></html>`;
  }

  const val = (k, def = "") => (booking[k] ?? def);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Assign Driver — ${booking.voucherCode}</title>
  <link rel="icon" href="/stb-logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;} body{margin:0;font-family:'Manrope',sans-serif;background:#FBF7F0;color:#141414;padding:32px 16px;min-height:100vh;}
    .container{max-width:560px;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 8px 24px rgba(0,0,0,0.06);overflow:hidden;}
    .ribbon{height:4px;background:linear-gradient(90deg,#E31E24,#D4A24A,#E31E24);}
    .header{padding:28px 32px 8px;text-align:center;}
    .header img{height:56px;margin-bottom:8px;}
    .brand{font-family:'Fraunces',serif;font-size:18px;font-weight:500;color:#141414;letter-spacing:-0.01em;}
    .badge{display:inline-block;background:#FDECEC;color:#B8171C;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:999px;margin:12px 0 8px;}
    h1{font-family:'Fraunces',serif;font-weight:500;font-size:26px;letter-spacing:-0.02em;margin:8px 0 4px;text-align:center;}
    h1 em{font-style:italic;color:#E31E24;}
    .sub{text-align:center;color:#6B6B6B;font-size:13px;margin-bottom:24px;}
    .booking-strip{margin:0 32px 24px;padding:16px;background:#FBF7F0;border-radius:14px;font-size:12px;line-height:1.7;color:#141414;}
    .booking-strip strong{color:#E31E24;}
    form{padding:0 32px 32px;}
    label{display:block;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#6B6B6B;margin:14px 0 6px;}
    input[type=text],input[type=tel],input[type=url]{width:100%;padding:12px 16px;border:1.5px solid #E8E4DE;border-radius:12px;font-size:14px;font-weight:600;font-family:inherit;outline:none;background:#fff;color:#141414;transition:all .2s ease;}
    input:focus{border-color:#E31E24;box-shadow:0 0 0 4px rgba(227,30,36,0.08);}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    @media(max-width:480px){.row{grid-template-columns:1fr;}}
    button{width:100%;margin-top:22px;padding:16px;background:linear-gradient(135deg,#E31E24,#B8171C);color:#fff;font-family:inherit;font-size:14px;font-weight:800;letter-spacing:0.02em;border:none;border-radius:14px;cursor:pointer;box-shadow:0 6px 20px rgba(227,30,36,0.3);transition:all .2s ease;}
    button:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(227,30,36,0.4);}
    .note{margin-top:12px;font-size:11px;text-align:center;color:#6B6B6B;line-height:1.5;}
    .ok{background:#E8F5E9;color:#1B7B3F;padding:14px 16px;border-radius:12px;font-size:13px;font-weight:700;margin:0 32px 20px;text-align:center;}
  </style></head><body>
  <div class="container">
    <div class="ribbon"></div>
    <div class="header">
      ${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${brand.name}"/>` : ""}
      <div class="brand">${brand.name} · Dispatch</div>
      <div class="badge">Assign Driver</div>
      <h1>Booking <em>${booking.voucherCode}</em></h1>
      <p class="sub">Fill in chauffeur details — the guest is emailed instantly the moment you save.</p>
    </div>
    ${message ? `<div class="ok">${message}</div>` : ""}
    <div class="booking-strip">
      <div><strong>${val("passengerName")}</strong> · ${val("pax", "")}</div>
      <div>${val("pickup")}${val("destination") ? " → " + val("destination") : ""}</div>
      <div>${val("dateTime", "Flexible")}${val("flightNo") ? " · Flight " + val("flightNo") : ""}</div>
      <div>${val("vehicle")} · ${val("fare")} ${val("currency", "")}</div>
    </div>
    <form method="POST" action="/assign/${encodeURIComponent(booking.voucherCode)}">
      <label>Driver name</label>
      <input type="text" name="driverName" required value="${val("driverName", "")}" placeholder="e.g. Chandran Raj" />
      <div class="row">
        <div>
          <label>Driver phone</label>
          <input type="tel" name="driverPhone" value="${val("driverPhone", "")}" placeholder="+65 9123 4567" />
        </div>
        <div>
          <label>Vehicle plate</label>
          <input type="text" name="driverPlate" required value="${val("driverPlate", "")}" placeholder="SGX 1234 A" style="text-transform:uppercase;" />
        </div>
      </div>
      <label>Driver photo URL (optional)</label>
      <input type="url" name="driverPhotoUrl" value="${val("driverPhotoUrl", "")}" placeholder="https://..." />
      <button type="submit">${ok ? "Update Driver Details" : "Save & Email Guest"}</button>
      <div class="note">You can edit these details anytime by re-opening this link.<br>Every save re-emails <strong>${val("passengerEmail")}</strong> with the latest chauffeur info.</div>
    </form>
  </div></body></html>`;
}

// ============================================
// REMINDER CRON
// ============================================
export async function handleRemindersCron() {
  const transporter = getTransporter();
  if (!transporter) return { status: 200, body: { skipped: "smtp-not-configured" } };

  const bookings = await listAllBookings();
  const now = Date.now();
  const WINDOW_MS = 12 * 60 * 60 * 1000;
  const brand = makeBrand("");
  const sent = [];
  const failed = [];

  for (const b of bookings) {
    if (b.reminderSentAt) continue;
    if (!b.dateTime || !b.passengerEmail) continue;

    const pickupMs = new Date(b.dateTime).getTime();
    if (Number.isNaN(pickupMs)) continue;

    const untilPickup = pickupMs - now;
    if (untilPickup <= WINDOW_MS && untilPickup > 0) {
      try {
        const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
        const info = await transporter.sendMail({
          from: `"${brand.name}" <${fromAddress}>`,
          replyTo: brand.email, to: b.passengerEmail,
          subject: `⏰ Your ride is tomorrow — ${b.voucherCode}`,
          html: reminderEmail(b, brand), text: reminderText(b),
        });
        await updateBooking(b.voucherCode, {
          reminderSentAt: new Date().toISOString(),
          reminderMessageId: info.messageId,
        });
        sent.push(b.voucherCode);
        console.log("[REMINDER] Sent for", b.voucherCode);
      } catch (err) {
        failed.push({ voucherCode: b.voucherCode, error: err.message });
        console.error("[REMINDER] Failed for", b.voucherCode, err.message);
      }
    }
  }

  return { status: 200, body: { scanned: bookings.length, sent, failed } };
}
