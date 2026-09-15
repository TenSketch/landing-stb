// STB Singapore — Persistent Express Server with Dynamic PostgreSQL Pricing Engine
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import cookieParser from "cookie-parser";

import {
  handleCreateBooking, handleGetAssign, handlePostAssign,
  getTransporter, handleEstimateFare,
} from "./lib/handlers.js";
import { storageMode } from "./lib/store.js";
import { query, logAudit, testConnection } from "./lib/db.js";
import { 
  requestAdminOtp, verifyAdminOtp, logoutAdminSession, requireAdminAuth 
} from "./lib/auth.js";
import apiRouter from "./lib/api.js";
import { optionalCustomerAuth } from "./lib/customerAuth.js";
import { getPublicBrandConfig, getBookingConfig, getContentConfig, getCurrencyConfig } from "./lib/settings.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy artifact hero background image to public/hero-bg.jpg if present
try {
  const artifactHero = "C:/Users/bala/.gemini/antigravity-ide/brain/3661ce98-69fa-4a86-be25-4857e224ab50/media__1786610258174.jpg";
  const targetHero = path.join(__dirname, "public", "hero-bg.jpg");
  if (fs.existsSync(artifactHero)) {
    fs.copyFileSync(artifactHero, targetHero);
  }
} catch (err) {
  // Skip fallback
}

const app = express();
const PORT = process.env.PORT || 3003;

// ─── Security Headers ───
app.use((req, res, next) => {
  const nonce = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  res.locals.nonce = nonce;

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.tailwindcss.com https://unpkg.com https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "img-src 'self' data: https: blob: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.google-analytics.com https://*.googletagmanager.com https://nominatim.openstreetmap.org https://unpkg.com https://maps.googleapis.com https://places.googleapis.com https://*.googleapis.com",
      "frame-src 'self' https://www.googletagmanager.com https://maps.google.com https://www.google.com",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.removeHeader("X-Powered-By");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static assets
app.use(express.static(path.join(__dirname, "public"), { index: false, extensions: ["html"] }));

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

// Check DB connectivity
testConnection().then((dbStatus) => {
  if (dbStatus.ok) {
    console.log("[POSTGRESQL] Connected successfully to database at", dbStatus.time);
  } else {
    console.warn("[POSTGRESQL] Database connection not ready:", dbStatus.error);
  }
});

// ---------- Config (public) ----------
app.get("/api/config", async (_req, res) => {
  try {
    res.json({
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      brand: await getPublicBrandConfig(),
      booking: await getBookingConfig(),
      content: await getContentConfig(),
      currency: await getCurrencyConfig()
    });
  } catch (err) {
    console.warn("[Config] failed to load dynamic config:", err.message);
    res.json({
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      brand: {
        name: process.env.BRAND_NAME || "STB Singapore",
        tagline: process.env.BRAND_TAGLINE || "Majestic Hospitality Since 2014",
        phone: process.env.CONTACT_PHONE || "+65 9062 9107",
        whatsapp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "+659****9107"
      },
      content: {}
    });
  }
});

// Mount new admin/customer API routes (these handle /api/admin/* and /api/*)
app.use("/api", apiRouter);

// ---------- Customer Bookings (Authoritative Server Validation) ----------
app.post("/api/bookings", optionalCustomerAuth, async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const payload = req.body || {};
  // Link logged-in customer if present and no customer_id provided
  if (req.customer && !payload.customerId) {
    payload.customerId = req.customer.id;
  }
  const r = await handleCreateBooking(payload, baseUrl);
  res.status(r.status).json(r.body);
});

// ---------- Health ----------
app.get("/api/health", async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: "ok",
    service: "STB Singapore",
    smtp: Boolean(transporter),
    database: dbStatus.ok ? "connected" : "disconnected",
    storage: storageMode,
    node: process.version,
  });
});

// ---------- Customer Fare Estimation ----------
app.post("/api/estimate", async (req, res) => {
  const referer = req.headers.referer || "https://singaporetourbooking.com/";
  const r = await handleEstimateFare(req.body || {}, referer);
  res.status(r.status).json(r.body);
});

// ============================================================
// ADMIN AUTHENTICATION API
// ============================================================
app.post("/api/admin/auth/request-otp", async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const result = await requestAdminOtp(req.body.email, baseUrl);
  res.status(result.status).json(result.body);
});

app.post("/api/admin/auth/verify-otp", async (req, res) => {
  const result = await verifyAdminOtp(req.body.email, req.body.otp);
  if (result.sessionToken) {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("stb_admin_session", result.sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/"
    });
  }
  res.status(result.status).json(result.body);
});

app.post("/api/admin/auth/logout", async (req, res) => {
  const token = req.cookies?.stb_admin_session;
  if (token) {
    await logoutAdminSession(token);
  }
  res.clearCookie("stb_admin_session", { path: "/" });
  res.json({ success: true, message: "Logged out successfully." });
});

app.get("/api/admin/auth/me", requireAdminAuth(), (req, res) => {
  res.json({ success: true, email: req.admin.email });
});

// ============================================================
// ADMIN PRICING MANAGEMENT API (Protected)
// ============================================================

// 1. Fetch full pricing configuration
app.get("/api/admin/pricing", requireAdminAuth(), async (_req, res) => {
  try {
    const [vehiclesRes, rulesRes, overridesRes, surchargesRes] = await Promise.all([
      query(`SELECT id, name, description, pax_max, is_active FROM vehicle_types ORDER BY id ASC`),
      query(`
        SELECT pr.id, pr.vehicle_id, vt.name as vehicle_name, 
               pr.base_fare, pr.per_km_rate, pr.minimum_fare, pr.hourly_rate, pr.daily_rate, pr.is_active
        FROM pricing_rules pr
        JOIN vehicle_types vt ON pr.vehicle_id = vt.id
        ORDER BY vt.id ASC
      `),
      query(`
        SELECT ro.id, ro.vehicle_id, vt.name as vehicle_name, 
               ro.origin_place_id, ro.destination_place_id, 
               ro.origin_display_name, ro.destination_display_name, 
               ro.fixed_price, ro.is_active, ro.created_at, ro.updated_at
        FROM route_overrides ro
        JOIN vehicle_types vt ON ro.vehicle_id = vt.id
        ORDER BY ro.created_at DESC
      `),
      query(`
        SELECT id, name, type, value, start_time, end_time, applicable_mode, is_active
        FROM surcharges
        ORDER BY id ASC
      `)
    ]);

    res.json({
      success: true,
      vehicles: vehiclesRes.rows,
      rules: rulesRes.rows,
      overrides: overridesRes.rows,
      surcharges: surchargesRes.rows
    });
  } catch (err) {
    console.error("[ADMIN PRICING GET] Error:", err.message);
    res.status(500).json({ error: "Failed to load pricing configuration." });
  }
});

// 2. Update pricing rules (Base fare, KM rate, Min fare, Hourly, Daily)
app.put("/api/admin/pricing/rules", requireAdminAuth(), async (req, res) => {
  const { rules } = req.body || {};
  if (!Array.isArray(rules) || rules.length === 0) {
    return res.status(400).json({ error: "Invalid rules payload. Expected array of pricing rules." });
  }

  try {
    for (const rule of rules) {
      const { vehicle_id, base_fare, per_km_rate, minimum_fare, hourly_rate, daily_rate, is_active } = rule;
      
      // Get existing values for audit log
      const existing = await query(`SELECT * FROM pricing_rules WHERE vehicle_id = $1`, [vehicle_id]);
      const oldVals = existing.rows[0] || null;

      const updated = await query(`
        INSERT INTO pricing_rules (vehicle_id, base_fare, per_km_rate, minimum_fare, hourly_rate, daily_rate, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (vehicle_id) DO UPDATE
        SET base_fare = EXCLUDED.base_fare,
            per_km_rate = EXCLUDED.per_km_rate,
            minimum_fare = EXCLUDED.minimum_fare,
            hourly_rate = EXCLUDED.hourly_rate,
            daily_rate = EXCLUDED.daily_rate,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING *
      `, [
        Number(vehicle_id),
        parseFloat(base_fare || 0),
        parseFloat(per_km_rate || 0),
        parseFloat(minimum_fare || 0),
        parseFloat(hourly_rate || 0),
        parseFloat(daily_rate || 0),
        is_active !== false
      ]);

      // Record audit history
      await logAudit({
        adminEmail: req.admin.email,
        tableName: "pricing_rules",
        recordId: vehicle_id,
        action: oldVals ? "UPDATE" : "INSERT",
        oldValues: oldVals,
        newValues: updated.rows[0]
      });
    }

    res.json({ success: true, message: "Pricing rules updated successfully." });
  } catch (err) {
    console.error("[ADMIN PRICING RULES PUT] Error:", err.message);
    res.status(500).json({ error: "Failed to update pricing rules: " + err.message });
  }
});

// 3. Create route override
app.post("/api/admin/pricing/overrides", requireAdminAuth(), async (req, res) => {
  const {
    vehicle_id, origin_place_id, destination_place_id,
    origin_display_name, destination_display_name, fixed_price, is_active
  } = req.body || {};

  if (!vehicle_id || !origin_place_id || !destination_place_id || fixed_price === undefined) {
    return res.status(400).json({ error: "Missing required fields for route override." });
  }

  try {
    const insertRes = await query(`
      INSERT INTO route_overrides 
        (vehicle_id, origin_place_id, destination_place_id, origin_display_name, destination_display_name, fixed_price, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (vehicle_id, origin_place_id, destination_place_id) DO UPDATE
      SET fixed_price = EXCLUDED.fixed_price,
          origin_display_name = EXCLUDED.origin_display_name,
          destination_display_name = EXCLUDED.destination_display_name,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      RETURNING *
    `, [
      Number(vehicle_id),
      origin_place_id.trim(),
      destination_place_id.trim(),
      (origin_display_name || "Custom Pickup").trim(),
      (destination_display_name || "Custom Dropoff").trim(),
      parseFloat(fixed_price),
      is_active !== false
    ]);

    const record = insertRes.rows[0];
    await logAudit({
      adminEmail: req.admin.email,
      tableName: "route_overrides",
      recordId: record.id,
      action: "INSERT",
      oldValues: null,
      newValues: record
    });

    res.json({ success: true, override: record });
  } catch (err) {
    console.error("[ADMIN OVERRIDE POST] Error:", err.message);
    res.status(500).json({ error: "Failed to save route override: " + err.message });
  }
});

// 4. Update route override
app.put("/api/admin/pricing/overrides/:id", requireAdminAuth(), async (req, res) => {
  const { id } = req.params;
  const { fixed_price, is_active } = req.body || {};

  try {
    const existing = await query(`SELECT * FROM route_overrides WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Route override not found." });
    }

    const oldVals = existing.rows[0];
    const updateRes = await query(`
      UPDATE route_overrides
      SET fixed_price = COALESCE($1, fixed_price),
          is_active = COALESCE($2, is_active),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [
      fixed_price !== undefined ? parseFloat(fixed_price) : null,
      is_active !== undefined ? Boolean(is_active) : null,
      id
    ]);

    const updated = updateRes.rows[0];
    await logAudit({
      adminEmail: req.admin.email,
      tableName: "route_overrides",
      recordId: id,
      action: "UPDATE",
      oldValues: oldVals,
      newValues: updated
    });

    res.json({ success: true, override: updated });
  } catch (err) {
    console.error("[ADMIN OVERRIDE PUT] Error:", err.message);
    res.status(500).json({ error: "Failed to update route override." });
  }
});

// 5. Delete route override
app.delete("/api/admin/pricing/overrides/:id", requireAdminAuth(), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await query(`SELECT * FROM route_overrides WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Route override not found." });
    }

    const oldVals = existing.rows[0];
    await query(`DELETE FROM route_overrides WHERE id = $1`, [id]);

    await logAudit({
      adminEmail: req.admin.email,
      tableName: "route_overrides",
      recordId: id,
      action: "DELETE",
      oldValues: oldVals,
      newValues: null
    });

    res.json({ success: true, message: "Route override deleted." });
  } catch (err) {
    console.error("[ADMIN OVERRIDE DELETE] Error:", err.message);
    res.status(500).json({ error: "Failed to delete route override." });
  }
});

// 6. Update surcharges
app.put("/api/admin/pricing/surcharges", requireAdminAuth(), async (req, res) => {
  const { surcharges } = req.body || {};
  if (!Array.isArray(surcharges)) {
    return res.status(400).json({ error: "Invalid surcharges payload." });
  }

  try {
    for (const sc of surcharges) {
      const { id, name, type, value, start_time, end_time, applicable_mode, is_active } = sc;
      const existing = await query(`SELECT * FROM surcharges WHERE id = $1`, [id]);
      const oldVals = existing.rows[0] || null;

      const updateRes = await query(`
        UPDATE surcharges
        SET name = COALESCE($1, name),
            type = COALESCE($2, type),
            value = COALESCE($3, value),
            start_time = COALESCE($4, start_time),
            end_time = COALESCE($5, end_time),
            applicable_mode = COALESCE($6, applicable_mode),
            is_active = COALESCE($7, is_active),
            updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `, [
        name, type, value !== undefined ? parseFloat(value) : null,
        start_time, end_time, applicable_mode,
        is_active !== undefined ? Boolean(is_active) : null,
        id
      ]);

      if (updateRes.rows.length > 0) {
        await logAudit({
          adminEmail: req.admin.email,
          tableName: "surcharges",
          recordId: id,
          action: "UPDATE",
          oldValues: oldVals,
          newValues: updateRes.rows[0]
        });
      }
    }

    res.json({ success: true, message: "Surcharges updated successfully." });
  } catch (err) {
    console.error("[ADMIN SURCHARGES PUT] Error:", err.message);
    res.status(500).json({ error: "Failed to update surcharges: " + err.message });
  }
});

// 7. Get Audit Log (Append-only read log)
app.get("/api/admin/audit", requireAdminAuth(), async (_req, res) => {
  try {
    const result = await query(`
      SELECT id, admin_email, table_name, record_id, action, old_values, new_values, changed_at
      FROM pricing_audit_history
      ORDER BY changed_at DESC
      LIMIT 100
    `);
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    console.error("[ADMIN AUDIT GET] Error:", err.message);
    res.status(500).json({ error: "Failed to load audit history." });
  }
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

app.post(["/assign/:voucherCode", "/api/assign/:voucherCode"], async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const r = await handlePostAssign(req.params.voucherCode, req.body || {}, baseUrl);
  if (req.path.startsWith("/api/")) {
    return res.status(r.status).json(r);
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(r.status).send(r.html);
});

// ---------- Admin App Route ----------
app.get(["/admin", "/admin/*"], (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

// ---------- SPA-ish fallback ----------
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`STB Singapore server running on http://localhost:${PORT}`);
});
