/**
 * Cloud persistence (Supabase) — REQUIRED for production.
 * Render's free filesystem is EPHEMERAL: every restart/redeploy WIPES
 * data/*.json (orders, referrals — gone overnight!). With two env keys set,
 * every save is mirrored to a Supabase `kv` table and restored on boot.
 * Without keys → pure local JSON (fine for testing; NOT for launch).
 *
 * Setup (free forever, no card): supabase.com → New project → SQL Editor → run:
 *   create table if not exists kv (key text primary key, value jsonb, updated_at timestamptz default now());
 * Then Project Settings → API → copy Project URL + service_role key into .env
 * as SUPABASE_URL / SUPABASE_SERVICE_KEY. (service_role stays server-side only.)
 *
 * Notes: free Supabase projects pause after 7 idle days — the bot keeps working
 * on local JSON regardless; unpause in Supabase dashboard to resume backups.
 * Our blobs are KBs — galaxies below the 500MB free limit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const REFERRALS_FILE = path.join(DATA_DIR, "referrals.json");

const URL = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = () => process.env.SUPABASE_SERVICE_KEY || "";
export const cloudEnabled = () => !!(URL() && KEY());

async function kvUpsert(key, value) {
  const res = await fetch(`${URL()}/rest/v1/kv`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: KEY(),
      Authorization: `Bearer ${KEY()}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`supabase upsert ${res.status}`);
}

/** Fire-and-forget mirrors: never throw, never block chat. */
export function backupTickets(tickets) {
  if (!cloudEnabled()) return;
  kvUpsert("tickets", tickets).catch((e) => console.error("cloud backup (tickets):", e.message));
}
export function backupReferrals(db) {
  if (!cloudEnabled()) return;
  kvUpsert("referrals", db).catch((e) => console.error("cloud backup (referrals):", e.message));
}

/** Boot restore: only fills files that are MISSING (fresh deploy / wiped disk). */
export async function restoreFromCloud() {
  if (!cloudEnabled()) {
    console.log("cloud backup OFF (no SUPABASE keys) — local JSON only");
    return { restored: [] };
  }
  const res = await fetch(`${URL()}/rest/v1/kv?select=key,value`, {
    signal: AbortSignal.timeout(15000),
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` },
  });
  if (!res.ok) throw new Error(`supabase restore ${res.status}`);
  const rows = await res.json();
  const map = Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
  const restored = [];
  for (const [key, file] of [["tickets", TICKETS_FILE], ["referrals", REFERRALS_FILE]]) {
    if (map[key] !== undefined && !fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(map[key], null, 2));
      restored.push(key);
    }
  }
  console.log("cloud restore:", restored.length ? restored.join(", ") : "nothing missing");
  return { restored };
}
