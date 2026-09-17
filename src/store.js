import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backupTickets as cloudBackupTickets } from "./backup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  // Mirror orders to the cloud (Supabase) — Render's free disk is wiped on
  // restart. Fire-and-forget: never blocks chat, no-op without keys.
  if (file === TICKETS_FILE) cloudBackupTickets(obj);
}

// ---- Orders (swap with DB / Shopify / sheet later) ----
export function findOrder(orderId) {
  const id = String(orderId || "").trim().toUpperCase();
  const orders = readJson(ORDERS_FILE, []);
  return orders.find((o) => o.id.toUpperCase() === id) || null;
}

// ---- Tickets (complaints/returns) ----
export function saveTicket(ticket) {
  const tickets = readJson(TICKETS_FILE, []);
  tickets.push({ ...ticket, createdAt: new Date().toISOString() });
  writeJson(TICKETS_FILE, tickets);
  return ticket;
}

export function getAllTickets() {
  return readJson(TICKETS_FILE, []);
}

// ---- Conversation state (in-memory; use Redis/DB in production) ----
/** customerPhone -> { step, form } */
export const sessions = new Map();
/** paused customers (human has taken over) */
export const paused = new Set();

export function getSession(phone) {
  if (!sessions.has(phone)) sessions.set(phone, { step: "idle", form: {}, menu: null });
  return sessions.get(phone);
}
export function resetSession(phone) {
  // Mutate in place (don't replace): callers keep using their `session`
  // reference after reset (cart checkout, menus), so it must stay live.
  const s = sessions.get(phone) || {};
  s.step = "idle";
  s.form = {};
  s.menu = null;
  sessions.set(phone, s);
}

// ---- Ticket lookup/update (used by payment matching) ----
export function getTicketByRef(ref) {
  const tickets = readJson(TICKETS_FILE, []);
  return tickets.find((t) => t.ref === ref) || null;
}
export function updateTicket(ref, patch) {
  const tickets = readJson(TICKETS_FILE, []);
  const i = tickets.findIndex((t) => t.ref === ref);
  if (i === -1) return null;
  tickets[i] = { ...tickets[i], ...patch };
  writeJson(TICKETS_FILE, tickets);
  return tickets[i];
}

// ---- Tickets by customer (repeat recognition, tap-to-track, paid matching) ----
export function getTicketsByCustomer(phone) {
  const tickets = readJson(TICKETS_FILE, []);
  return tickets.filter((t) => t.customer === phone);
}
export function getLatestTicketByCustomer(phone) {
  const list = getTicketsByCustomer(phone);
  return list.length ? list[list.length - 1] : null;
}
