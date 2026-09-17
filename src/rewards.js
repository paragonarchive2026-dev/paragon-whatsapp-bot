/**
 * Referral program + automatic discounts (ZERO owner effort).
 * - Every customer gets a code (PG-XXXX). They share a wa.me link with the
 *   code pre-filled — friend taps the link, presses send, done (no typing).
 *   Plain wa.me links carry no webhook attribution, so the pre-filled text
 *   IS the tracking mechanism (research-confirmed pattern).
 * - A referral counts when the friend creates their FIRST order/request ticket.
 * - Milestones (owner's policy): 1 → 10% off next order · 3 → FREE Starter
 *   (any platform) · 5 → FREE Growth (any platform).
 * - Rewards AUTO-APPLY at checkout (chat, cart, flow form, /quote) — nobody
 *   types anything, owner does nothing. Free-item rewards zero the total and
 *   auto-confirm; admin just fulfills (with an alert saying why it's free).
 * - Ads bonus: Click-to-WhatsApp ad touches (message.referral, ctwa) are stored
 *   as first-touch acquisition for future use.
 * Storage: data/referrals.json { users: { phone: {...} } } (+ cloud mirror).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendText } from "./whatsapp.js";
import { backupReferrals as cloudBackupReferrals } from "./backup.js";

const SHOP = () => process.env.SHOP_NAME || "Paragon Hub";
const ADMIN = () => process.env.ADMIN_PHONE || "";
const TAGLINE = "Fast. Creative. Affordable. That's The Paragon Way! 💪🏽";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_FILE = path.join(__dirname, "..", "data", "referrals.json");

// "FREE Starter / Growth on ANY platform" = any of these product IDs.
const STARTER_IDS = new Set(["B001", "F004", "I007", "T006", "TG003", "TR002", "X004", "Y005"]);
const GROWTH_IDS = new Set(["B002", "F005", "I008", "T007", "TG004", "TR003", "X005", "Y006"]);

function readDb() {
  try {
    const db = JSON.parse(fs.readFileSync(REF_FILE, "utf8"));
    db.users ??= {};
    return db;
  } catch {
    return { users: {} };
  }
}
function writeDb(db) {
  fs.mkdirSync(path.dirname(REF_FILE), { recursive: true });
  fs.writeFileSync(REF_FILE, JSON.stringify(db, null, 2));
  cloudBackupReferrals(db); // fire-and-forget cloud mirror (no-op without keys)
}
function userOf(db, phone) {
  db.users[phone] ??= {
    code: null, referredBy: null, creditGiven: false,
    referrals: [], grants: [],
    rewards: { off10: 0, freeStarter: false, freeGrowth: false },
    rewardsUsed: [], acquiredVia: null,
  };
  return db.users[phone];
}

const CODE_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Every customer gets a permanent code (created on first need). */
export function getOrCreateCode(phone) {
  const db = readDb();
  const u = userOf(db, phone);
  if (!u.code) {
    const taken = new Set(Object.values(db.users).map((x) => x.code).filter(Boolean));
    let code;
    do {
      code = "PG-" + Array.from({ length: 4 }, () => CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)]).join("");
    } while (taken.has(code));
    u.code = code;
    writeDb(db);
  }
  return u.code;
}

export function findOwnerByCode(code) {
  code = String(code || "").trim().toUpperCase();
  if (!code) return null;
  const db = readDb();
  for (const [phone, u] of Object.entries(db.users)) {
    if (u.code === code) return phone;
  }
  return null;
}

/** Find a referral code inside free text (wa.me prefill or typed). */
export function parseCode(text) {
  const m = String(text || "").toUpperCase().match(/PG-[A-Z0-9]{4}/);
  return m ? m[0] : null;
}

/** Tap-to-share link: friend taps → WhatsApp opens with text ready → presses send. */
export function shareLink(phone) {
  const bot = (process.env.BOT_NUMBER || "").replace(/\D/g, "");
  if (!bot) return "";
  const code = getOrCreateCode(phone);
  const msg = `Hi ${SHOP()}! I was referred by ${code}`;
  return `https://wa.me/${bot}?text=${encodeURIComponent(msg)}`;
}

/** A newcomer arrived with a code. Credit lands when they place order #1. */
export async function recordJoin(newPhone, code) {
  const owner = findOwnerByCode(code);
  if (!owner) return { ok: false, reason: "unknown" };
  if (owner === newPhone) return { ok: false, reason: "self" };
  const db = readDb();
  const u = userOf(db, newPhone);
  if (u.referredBy) return { ok: false, reason: "already", by: u.referredBy };
  u.referredBy = code;
  writeDb(db);
  try {
    await sendText(owner, `🎉 Someone just joined with YOUR referral code!\nYou'll earn your reward automatically once they place their first order. Keep sharing! 🙌\n\n${TAGLINE}`);
  } catch { /* notify is best-effort */ }
  return { ok: true, owner };
}

/**
 * Call after ANY ticket creation. On the buyer's first ticket, the referrer
 * earns + milestone grants are issued + everyone is notified. Owner lifts
 * zero fingers.
 */
export async function recordOrderCredit(buyerPhone) {
  const db = readDb();
  const u = userOf(db, buyerPhone);
  if (!u.referredBy || u.creditGiven) return null;
  const owner = findOwnerByCode(u.referredBy);
  if (!owner) return null;
  u.creditGiven = true;
  const o = userOf(db, owner);
  if (!o.referrals.includes(buyerPhone)) o.referrals.push(buyerPhone);
  const n = o.referrals.length;
  const grants = [];
  if (n >= 1 && !o.grants.includes("m1")) {
    o.grants.push("m1");
    o.rewards.off10 += 1;
    grants.push("10% off your next order");
  }
  if (n >= 3 && !o.grants.includes("m3")) {
    o.grants.push("m3");
    o.rewards.freeStarter = true;
    grants.push("FREE Starter Package (any platform!)");
  }
  if (n >= 5 && !o.grants.includes("m5")) {
    o.grants.push("m5");
    o.rewards.freeGrowth = true;
    grants.push("FREE Growth Package (any platform!)");
  }
  writeDb(db);
  if (grants.length) {
    try {
      await sendText(owner, `🎁 *Referral reward unlocked!*\n${grants.map((g) => `• ${g}`).join("\n")}\n\nIt applies AUTOMATICALLY on your next order — no code to type, just order as normal 😊\n\n${TAGLINE}`);
    } catch { /* best-effort */ }
  }
  if (ADMIN()) {
    try {
      await sendText(ADMIN(), `🎁 Referral: ${owner} now has ${n} order-counted referral(s)${grants.length ? ` → granted: ${grants.join(", ")}` : ""}. (Fully automatic — FYI only.)`);
    } catch { /* best-effort */ }
  }
  return { owner, count: n, grants };
}

/** Best unused reward for a single-product checkout (chat / flow / quote). */
export function peekReward(phone, productId, total) {
  const db = readDb();
  const u = db.users[phone];
  if (!u || !(total > 0)) return null;
  const pid = String(productId || "").toUpperCase();
  if (u.rewards.freeStarter && STARTER_IDS.has(pid)) {
    return { type: "free_starter", label: "FREE Starter reward", discount: total };
  }
  if (u.rewards.freeGrowth && GROWTH_IDS.has(pid)) {
    return { type: "free_growth", label: "FREE Growth reward", discount: total };
  }
  if (u.rewards.off10 > 0) {
    return { type: "off10", label: "10% referral reward", discount: Math.max(1, Math.round(total * 0.1)) };
  }
  return null;
}

/** Best unused reward for a native-cart checkout (multi-line). */
export function peekCartReward(phone, lines, total) {
  const db = readDb();
  const u = db.users[phone];
  if (!u || !(total > 0)) return null;
  const fixed = (lines || []).filter((l) => !l.quote);
  const skus = fixed.map((l) => String(l.sku).toUpperCase());
  if (u.rewards.freeStarter && skus.length && skus.every((s) => STARTER_IDS.has(s))) {
    return { type: "free_starter", label: "FREE Starter reward", discount: total };
  }
  if (u.rewards.freeGrowth && skus.length && skus.every((s) => GROWTH_IDS.has(s))) {
    return { type: "free_growth", label: "FREE Growth reward", discount: total };
  }
  if (u.rewards.off10 > 0) {
    return { type: "off10", label: "10% referral reward", discount: Math.max(1, Math.round(total * 0.1)) };
  }
  return null;
}

/** Burn a reward at ticket creation (call only when actually applied). */
export function consumeReward(phone, type) {
  const db = readDb();
  const u = db.users[phone];
  if (!u) return;
  if (type === "off10") u.rewards.off10 = Math.max(0, u.rewards.off10 - 1);
  if (type === "free_starter") u.rewards.freeStarter = false;
  if (type === "free_growth") u.rewards.freeGrowth = false;
  u.rewardsUsed.push({ type, at: new Date().toISOString() });
  writeDb(db);
}

export function rewardsSummary(phone) {
  const code = getOrCreateCode(phone);
  const db = readDb();
  const u = db.users[phone];
  const n = u.referrals.length;
  const lines = [`🎁 *My rewards*`, ``, `Your code: *${code}*`, `Friends who ordered: *${n}*`, ``, `Your unused rewards:`];
  const rw = [];
  if (u.rewards.off10 > 0) rw.push(`• 10% off your next order (x${u.rewards.off10}) — auto-applies!`);
  if (u.rewards.freeStarter) rw.push(`• FREE Starter Package (any platform!) — order any Starter, pay ₦0`);
  if (u.rewards.freeGrowth) rw.push(`• FREE Growth Package (any platform!) — order any Growth, pay ₦0`);
  lines.push(rw.length ? rw.join("\n") : `• None yet — share your code to earn!`);
  lines.push(
    ``,
    n >= 5
      ? `🏆 All milestones smashed — you're a legend!`
      : n >= 3
        ? `Next: *${5 - n} more* friend(s) → FREE Growth Package!`
        : n >= 1
          ? `Next: *${3 - n} more* → FREE Starter Package!`
          : `Next: *1 friend* orders → 10% off for you!`
  );
  lines.push(``, TAGLINE);
  return lines.join("\n");
}

/** Store Click-to-WhatsApp ad first-touch (for future ads; organic uses codes). */
export function recordAcquisition(phone, referral) {
  if (!referral) return;
  try {
    const db = readDb();
    const u = userOf(db, phone);
    if (!u.acquiredVia) {
      u.acquiredVia = {
        at: new Date().toISOString(),
        source_type: referral.source_type || "",
        source_id: referral.source_id || "",
        headline: referral.headline || "",
      };
      writeDb(db);
    }
  } catch { /* never block chat on analytics */ }
}
