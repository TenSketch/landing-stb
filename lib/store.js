// Dual-mode storage: Vercel KV in production, JSON file for local dev.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USE_KV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

// ---------- Vercel KV path ----------
let kvClient = null;
async function getKv() {
  if (!USE_KV) return null;
  if (kvClient) return kvClient;
  const mod = await import("@vercel/kv");
  kvClient = mod.kv;
  return kvClient;
}

// ---------- File path (local dev / serverless fallback) ----------
// Vercel and many serverless platforms only allow writes under /tmp
function getWritableDataDir() {
  const projectDir = path.join(__dirname, "..", "data");
  try {
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
    fs.accessSync(projectDir, fs.constants.W_OK);
    return projectDir;
  } catch {
    return "/tmp/stb-data";
  }
}

const DATA_DIR = getWritableDataDir();
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, "[]");
}
function readFile() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf8") || "[]"); }
  catch { return []; }
}
function writeFile(list) {
  ensureFile();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2));
}

// ---------- Public API ----------
export async function saveBooking(booking) {
  if (USE_KV) {
    const kv = await getKv();
    await kv.set(`booking:${booking.voucherCode}`, booking);
    await kv.sadd("bookings:index", booking.voucherCode);
    return booking;
  }
  const list = readFile();
  list.push(booking);
  writeFile(list);
  return booking;
}

export async function getBooking(voucherCode) {
  if (USE_KV) {
    const kv = await getKv();
    return await kv.get(`booking:${voucherCode}`);
  }
  return readFile().find((b) => b.voucherCode === voucherCode) || null;
}

export async function updateBooking(voucherCode, patch) {
  if (USE_KV) {
    const kv = await getKv();
    const existing = await kv.get(`booking:${voucherCode}`);
    if (!existing) return null;
    const merged = { ...existing, ...patch };
    await kv.set(`booking:${voucherCode}`, merged);
    return merged;
  }
  const list = readFile();
  const idx = list.findIndex((b) => b.voucherCode === voucherCode);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  writeFile(list);
  return list[idx];
}

export async function listAllBookings() {
  if (USE_KV) {
    const kv = await getKv();
    const codes = await kv.smembers("bookings:index");
    if (!codes || !codes.length) return [];
    const results = await Promise.all(codes.map((c) => kv.get(`booking:${c}`)));
    return results.filter(Boolean);
  }
  return readFile();
}

export const storageMode = USE_KV ? "vercel-kv" : "local-file";
