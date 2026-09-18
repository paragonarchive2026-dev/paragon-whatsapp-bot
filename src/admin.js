/**
 * In-chat admin console: tap-to-approve payments + pending dashboard.
 * Customer submits their bank transaction ID → admin gets an approval card
 * with [Approve] [Decline] [View] → tap Approve → ticket confirmed + customer
 * auto-notified. "pending" shows the live dashboard; tapping any order opens
 * it with the same buttons. /paid still works as the typing alternative.
 * ALL actions are sender-guarded: only ADMIN_PHONE can use them.
 */
import { sendText, sendButtons, sendList, sendReaction, sendUrlButton, sendTemplate } from "./whatsapp.js";
import { getTicketByRef, updateTicket, getAllTickets, resetSession, paused } from "./store.js";
import { formatPrice } from "./catalog.js";
import { paymentsEnabled, createPaymentLink } from "./payments.js";
import { peekReward, consumeReward } from "./rewards.js";

const ADMIN = () => process.env.ADMIN_PHONE || "";
const TAGLINE = "Fast. Creative. Affordable. That's The Paragon Way! 💪🏽";
const isAdmin = (from) => ADMIN() && from === ADMIN();

const uslice = (s, n) => [...String(s || "")].slice(0, n).join("");
const num = (i, title, max = 24) => `${i + 1}. ${uslice(title, max - `${i + 1}. `.length)}`;

const PAYABLE = ["new_order", "quoted", "deposit_paid", "awaiting_quote"];
const OPEN = ["new_order", "quoted", "awaiting_quote", "deposit_paid"];

/** Shared payment-confirm core (used by /paid AND the Approve button). */
export async function confirmTicketPayment(ref, amount, channel = "manual") {
  const ticket = getTicketByRef(ref);
  if (!ticket) return { ok: false, reason: "no_ticket" };
  if (!PAYABLE.includes(ticket.status)) return { ok: false, reason: "bad_status", ticket };
  if (ticket.status === "paid") return { ok: true, already: true, ticket };
  const total = ticket.total || 0;
  const newPaid = (ticket.paidSoFar || 0) + amount;
  const fully = total > 0 && newPaid >= total;
  updateTicket(ticket.ref, {
    status: fully ? "paid" : "deposit_paid",
    paidSoFar: newPaid,
    dueNow: Math.max(0, total - newPaid),
    paidAt: new Date().toISOString(),
    channel,
  });
  const t = getTicketByRef(ref);
  if (fully) {
    await sendText(
      ticket.customer,
      `✅ *Payment confirmed!*\n\n🧾 Order *${ticket.ref}*${ticket.product ? ` (${ticket.product})` : ""}\n💰 Paid in full: *${formatPrice(newPaid)}*\nWork is now scheduled — we'll update you here 🛠️\nType *menu* for anything else.\n\n${TAGLINE}`
    );
  } else {
    await sendText(
      ticket.customer,
      `✅ *Payment received!* ${formatPrice(amount)}\n\n🧾 Order *${ticket.ref}*` +
        (total ? `\nPaid *${formatPrice(newPaid)}* of *${formatPrice(total)}* — balance *${formatPrice(total - newPaid)}* due before delivery.` : "") +
        `\nWork is scheduled 🛠️\n\n${TAGLINE}`
    );
  }
  return { ok: true, fully, ticket: t, newPaid };
}

/** Admin tapped ✅ Approve on a card (or in View). Amount = expected chunk. */
export async function handleApprove(from, ref, messageId) {
  if (!isAdmin(from)) {
    await sendText(from, "⛔ Admin only.");
    return;
  }
  const ticket = getTicketByRef(String(ref || "").toUpperCase());
  if (!ticket) {
    await sendText(from, `❌ No ticket ${ref}.`);
    return;
  }
  if (ticket.status === "paid") {
    await sendText(from, `ℹ️ ${ticket.ref} is already confirmed ✅ (double-tap safe — nothing charged twice).`);
    return;
  }
  const due = ticket.dueNow ?? ticket.total ?? 0;
  if (!(due > 0)) {
    await sendText(from, `❌ ${ticket.ref} has no amount due (status: ${ticket.status}). Price it first (👑 menu → 💰 Quote), or confirm a custom amount: /paid ${ticket.ref} <amount>.`);
    return;
  }
  await sendReaction(from, messageId, "✅");
  const res = await confirmTicketPayment(ticket.ref, due, "manual");
  if (!res.ok) {
    await sendText(from, `❌ Couldn't confirm ${ticket.ref} (${res.reason || "error"}).`);
    return;
  }
  if (res.already) {
    await sendText(from, `ℹ️ ${ticket.ref} is already confirmed ✅`);
    return;
  }
  await sendText(
    from,
    res.fully
      ? `✅ ${ticket.ref} APPROVED — paid in full (${formatPrice(res.newPaid)}). Customer notified.`
      : `✅ ${ticket.ref} APPROVED — ${formatPrice(due)} recorded (${formatPrice(res.newPaid)}${ticket.total ? ` of ${formatPrice(ticket.total)}` : ""}). Customer notified.`
  );
}

/** Admin tapped ❌ Decline → ask for the reason, then notify the customer. */
export async function handleDeclineStart(from, ref, session) {
  if (!isAdmin(from)) {
    await sendText(from, "⛔ Admin only.");
    return;
  }
  const ticket = getTicketByRef(String(ref || "").toUpperCase());
  if (!ticket) {
    await sendText(from, `❌ No ticket ${ref}.`);
    return;
  }
  if (ticket.status === "paid") {
    await sendText(from, `ℹ️ ${ticket.ref} is already confirmed — can't decline it.`);
    return;
  }
  session.step = "awaiting_decline_reason";
  session.form = { kind: "decline", ref: ticket.ref };
  await sendText(from, `Declining *${ticket.ref}* — reply with the reason for the customer (e.g. "amount too low — expected ₦15,000").\nOr *cancel* to keep it pending.`);
}

export async function handleDeclineReason(from, session, text) {
  const ref = session.form?.ref;
  const ticket = ref && getTicketByRef(ref);
  resetSession(from);
  if (!ticket) {
    await sendText(from, "Ticket vanished — nothing sent.");
    return;
  }
  await sendText(
    ticket.customer,
    `⚠️ *Payment update for ${ticket.ref}*\n\nWe couldn't confirm your payment: ${text}\n\nPlease check the amount / reference and try again — or type *human* and we'll sort it out 🙏\n\n${TAGLINE}`
  );
  await sendText(from, `✅ Customer ${ticket.customer} notified that ${ticket.ref} was declined. Ticket stays open.`);
}

/** The approval card: everything the admin needs + one-tap decision. */
export async function sendApprovalCard(adminPhone, ticket) {
  const due = ticket.dueNow ?? ticket.total ?? 0;
  const total = ticket.total || 0;
  await sendText(
    adminPhone,
    `💳 *PAYMENT APPROVAL*\n\n🧾 *${ticket.ref}* — ${ticket.product || ""}${ticket.qty > 1 ? ` x${ticket.qty}` : ""}` +
      `\n👤 ${ticket.name || "?"} (${ticket.customer})` +
      (ticket.phone ? `\n📞 ${ticket.phone}` : "") +
      `\n💰 Total: ${total ? formatPrice(total) : "—"} • Due now: ${due ? formatPrice(due) : "—"}` +
      `\n🏦 Customer's bank ref: *${ticket.bankRef || "— (skipped)"}*` +
      `\n📌 Status: ${ticket.status}` +
      `\n\nTap to decide 👇 (wrong amount? 👑 menu → Confirm payment → ✏️ Amount)`
  );
  await sendButtons(adminPhone, `Approve *${ticket.ref}*?`, [
    { id: `approve_${ticket.ref}`, title: "✅ Approve" },
    { id: `decline_${ticket.ref}`, title: "❌ Decline" },
    { id: `adminview_${ticket.ref}`, title: "👁 View Order" },
  ]);
}

/** Live dashboard: all open tickets + money due. Admin-only (guarded by caller). */
export async function showPendingDashboard(to, session = null) {
  const open = getAllTickets().filter((t) => t.ref && OPEN.includes(t.status));
  if (!open.length) {
    await sendText(to, `🎉 Nothing pending — all clear!\n\n${TAGLINE}`);
    return;
  }
  const list = open.slice(-8).reverse();
  const dueTotal = open.reduce((s, t) => s + (t.dueNow ?? t.total ?? 0), 0);
  if (session) session.menu = list.map((t) => `adminview_${t.ref}`);
  await sendList(to, `📊 *Pending approvals* (${open.length} open • ${formatPrice(dueTotal)} due)\nTap an order to review + approve 👇`, "View pending", [
    {
      title: "Open orders",
      rows: list.map((t, i) => ({
        id: `adminview_${t.ref}`,
        title: num(i, t.ref),
        description: `${t.product || ""} • ${t.total ? formatPrice(t.total) : "quote"} • ${t.status}`.slice(0, 72),
      })),
    },
  ]);
}

/** Full ticket detail + decision buttons. Admin-only (guarded by caller). */
export async function showTicketAdmin(to, ref, session = null) {
  const t = getTicketByRef(String(ref || "").toUpperCase());
  if (!t) {
    await sendText(to, `❌ No ticket ${ref}.`);
    return;
  }
  await sendText(
    to,
    `🧾 *${t.ref}* (${t.status})` +
      `\nService: ${t.product || "—"}${t.qty > 1 ? ` x${t.qty}` : ""}` +
      `\nCustomer: ${t.name || "?"} • ${t.customer}` +
      (t.phone ? `\nPhone: ${t.phone}` : "") +
      `\nTotal: ${t.total ? formatPrice(t.total) : "—"} • Paid: ${formatPrice(t.paidSoFar || 0)} • Due: ${formatPrice(t.dueNow ?? t.total ?? 0)}` +
      `\nBank ref: ${t.bankRef || "—"}` +
      (t.rewardApplied ? `\nReward: ${t.rewardApplied}` : "") +
      `\nDetails: ${uslice(t.details || "—", 300)}`
  );
  if (session) session.menu = [`approve_${t.ref}`, `decline_${t.ref}`, "pending"];
  await sendButtons(to, "Decide 👇", [
    { id: `approve_${t.ref}`, title: "✅ Approve" },
    { id: `decline_${t.ref}`, title: "❌ Decline" },
    { id: "pending", title: "📋 Pending" },
  ]);
}

// Installments: orders at/above this split into 50% deposit + 50% before delivery
// (moved here from bot.js so the quote core + boss console share it).
const THRESHOLD = () => Number(process.env.INSTALLMENT_THRESHOLD || 20000);
export const depositDue = (total) => (total >= THRESHOLD() ? Math.ceil(total / 2) : total);

// ---- Shared cores: used by BOTH the /commands and the 👑 button flows ----
export async function resumeChat(adminFrom, target) {
  const from = adminFrom;
  paused.delete(target);
  resetSession(target);
  await sendText(from, `✅ Bot resumed for ${target}.`);
  await sendText(target, "You're back with the assistant 🤖. Type *menu* to continue.");
}

export async function sendQuoteNow(adminFrom, target, amount) {
  const from = adminFrom;
  const ticket = getTicketByRef(String(target).toUpperCase());
  if (!ticket) {
    await sendText(from, `❌ No ticket ${target}.`);
    return;
  }
  if (!amount || amount < 100) {
    await sendText(from, "❌ Bad amount. Usage: /quote SHOP-XXX 45000");
    return;
  }
  // Referral rewards auto-apply on quotes too — owner quotes the real price,
  // bot silently deducts, everyone is told.
  let final = amount;
  let rewardNote = "";
  const reward = peekReward(ticket.customer, ticket.productId, amount);
  if (reward) {
    final = Math.max(0, amount - reward.discount);
    consumeReward(ticket.customer, reward.type);
    rewardNote = `\n🎁 ${reward.label} auto-applied: *-${formatPrice(reward.discount)}*`;
  }
  const due = depositDue(final);
  const split = due < final;
  updateTicket(ticket.ref, { total: final, status: "quoted", paidSoFar: 0, dueNow: final, rewardApplied: reward ? reward.type : null });
  const note =
    `💰 *Quote for ${ticket.ref}*\n\n🧾 ${ticket.product}` +
    `\n💰 Total: *${formatPrice(final)}*` +
    rewardNote +
    (split ? `\n\n💳 *Installments:* pay *50% deposit (${formatPrice(due)})* to start — balance *${formatPrice(final - due)}* before delivery.` : "") +
    `\n\n⚠️ Payment first — work begins once confirmed, by appointment 📅`;
  if (paymentsEnabled()) {
    try {
      const link = await createPaymentLink({
        email: `${ticket.customer}@whatsapp.shop`,
        amountKobo: Math.round(due * 100),
        reference: ticket.ref,
        metadata: { phone: ticket.customer, product: ticket.product },
      });
      await sendText(ticket.customer, note);
      await sendUrlButton(ticket.customer, `Pay *${formatPrice(due)}* now with card, transfer or USSD 👇\n\n${TAGLINE}`, "Pay Now", link.authorization_url, { footer: `Ref: ${ticket.ref}` });
      await sendText(from, `✅ Quote ${formatPrice(final)} + payment link (${formatPrice(due)} now) sent to ${ticket.customer}.${reward ? ` (🎁 ${reward.type} auto-applied)` : ""}`);
    } catch (e) {
      await sendText(from, "❌ Paystack error: " + e.message);
    }
  } else {
    const acct = process.env.SHOP_ACCOUNT_DETAILS || "(set SHOP_ACCOUNT_DETAILS in env)";
    await sendText(ticket.customer, note + `\n\n💳 Transfer *${formatPrice(due)}* (exact) to:\n${acct}\nNarration: *${ticket.ref}*\nThen reply *paid* ✅\n\n${TAGLINE}`);
    await sendText(from, `✅ Quote sent (manual mode) to ${ticket.customer}.${reward ? ` (🎁 ${reward.type} auto-applied)` : ""}`);
  }
}

export async function sendBalanceNow(adminFrom, target) {
  const from = adminFrom;
  const ticket = getTicketByRef(String(target).toUpperCase());
  if (!ticket) {
    await sendText(from, `❌ No ticket ${target}.`);
    return;
  }
  const total = ticket.total || 0;
  if (!total) {
    await sendText(from, "❌ No total on this ticket — use /quote first.");
    return;
  }
  const bal = total - (ticket.paidSoFar || 0);
  if (bal <= 0) {
    await sendText(from, `✅ ${ticket.ref} is already fully paid.`);
    return;
  }
  updateTicket(ticket.ref, { dueNow: bal });
  if (paymentsEnabled()) {
    try {
      const bRef = `${ticket.ref}-BAL`;
      updateTicket(ticket.ref, { balanceRef: bRef });
      const link = await createPaymentLink({
        email: `${ticket.customer}@whatsapp.shop`,
        amountKobo: Math.round(bal * 100),
        reference: bRef,
        metadata: { phone: ticket.customer, product: ticket.product, kind: "balance" },
      });
      await sendText(ticket.customer, `💰 *Balance due for ${ticket.ref}*\n\nPaid so far: ${formatPrice(total - bal)}\nBalance: *${formatPrice(bal)}*\n\nPay to unlock delivery ✅`);
      await sendUrlButton(ticket.customer, `Pay balance *${formatPrice(bal)}* 👇\n\n${TAGLINE}`, "Pay Balance", link.authorization_url, { footer: `Ref: ${bRef}` });
      await sendText(from, `✅ Balance link (${formatPrice(bal)}) sent to ${ticket.customer}.`);
    } catch (e) {
      await sendText(from, "❌ Paystack error: " + e.message);
    }
  } else {
    const acct = process.env.SHOP_ACCOUNT_DETAILS || "(set SHOP_ACCOUNT_DETAILS in env)";
    await sendText(ticket.customer, `💰 *Balance due for ${ticket.ref}*\n\nPaid so far: ${formatPrice(total - bal)}\nTransfer balance *${formatPrice(bal)}* (exact) to:\n${acct}\nNarration: *${ticket.ref}*\nThen reply *paid* ✅\n\n${TAGLINE}`);
    await sendText(from, `✅ Balance request sent (manual). Confirm with: /paid ${ticket.ref} ${bal}`);
  }
}

export async function reportPaidResult(adminFrom, ticket, amt, channel = "manual") {
  const from = adminFrom;
  const total = ticket.total || 0;
  const res = await confirmTicketPayment(ticket.ref, amt, "manual");
  if (!res.ok) {
    await sendText(from, `❌ Couldn't confirm ${ticket.ref} (${res.reason || "error"}).`);
    return;
  }
  if (res.already) {
    await sendText(from, `ℹ️ ${ticket.ref} is already paid ✅`);
    return;
  }
  await sendText(from, res.fully
    ? `✅ ${ticket.ref} marked PAID IN FULL (${formatPrice(res.newPaid)}), customer notified.`
    : `✅ ${ticket.ref}: ${formatPrice(amt)} recorded (total paid ${formatPrice(res.newPaid)}${total ? ` of ${formatPrice(total)}` : ""}). Customer notified.`);
}

export async function sendRemindNow(adminFrom, target) {
  const from = adminFrom;
  const ticket = getTicketByRef(String(target).toUpperCase());
  if (!ticket) {
    await sendText(from, `❌ No ticket ${target}.`);
    return;
  }
  const tpl = process.env.TEMPLATE_REMINDER;
  if (!tpl) {
    await sendText(from, "❌ Set TEMPLATE_REMINDER in .env to an approved Utility template first (see TEMPLATES.md).");
    return;
  }
  const due = ticket.dueNow ?? ticket.total ?? 0;
  try {
    await sendTemplate(ticket.customer, tpl, "en", [
      { type: "body", parameters: [{ type: "text", text: ticket.name || "there" }, { type: "text", text: ticket.ref }, { type: "text", text: formatPrice(due) }] },
    ]);
    await sendText(from, `✅ Reminder sent to ${ticket.customer} for ${ticket.ref}.`);
  } catch (e) {
    await sendText(from, "❌ Template send failed: " + (e.response?.data?.error?.message || e.message));
  }
}

// ================= 👑 BOSS CONSOLE (button menu for the admin) =================
/** Top menu: Pending / Quote / More. Admin-only (guarded by caller). */
export async function showAdminMenu(to, session = null) {
  const open = getAllTickets().filter((t) => t.ref && OPEN.includes(t.status));
  const dueTotal = open.reduce((s, t) => s + (t.dueNow ?? t.total ?? 0), 0);
  if (session) session.menu = ["pending", "aquote_pick", "adminmore"];
  await sendButtons(to, `👑 *BOSS CONSOLE*\n${open.length} open • ${formatPrice(dueTotal)} due\nTap what you want to do 👇`, [
    { id: "pending", title: "1. 📋 Pending" },
    { id: "aquote_pick", title: "2. 💰 Quote" },
    { id: "adminmore", title: "3. 📂 More" },
  ], { header: "👑 PARAGON BOSS", footer: "Tap or reply 1, 2, 3" });
}

/** Second level: everything else. Admin-only (guarded by caller). */
export async function showAdminMore(to, session = null) {
  const rows = [
    { id: "apaid_pick", title: "Confirm payment" },
    { id: "abal_pick", title: "Request balance" },
    { id: "aremind_pick", title: "Send reminder" },
    { id: "aresume_list", title: "Paused chats" },
    { id: "ahelp", title: "Admin help" },
    { id: "custmenu", title: "Customer menu (preview)" },
  ];
  if (session) session.menu = [...rows.map((r) => r.id), "adminmenu"];
  await sendList(to, "👑 *More boss actions* — tap one 👇", "Boss actions", [
    { title: "Actions", rows: rows.map((r, i) => ({ ...r, title: num(i, r.title) })) },
    { title: "More", rows: [{ id: "adminmenu", title: num(rows.length, "👑 Boss menu") }] },
  ]);
}

const PICK = {
  quote: { filter: (t) => t.status === "awaiting_quote", prefix: "aquote_", empty: "No quote requests waiting 🎉\nNew requests appear here automatically." },
  paid: { filter: (t) => ["new_order", "quoted", "deposit_paid"].includes(t.status), prefix: "apaid_", empty: "Nothing awaiting payment confirmation 🎉" },
  balance: { filter: (t) => t.status === "deposit_paid", prefix: "abal_", empty: "No deposits awaiting balance 🎉" },
  remind: { filter: (t) => ["new_order", "quoted", "deposit_paid"].includes(t.status) && ((t.dueNow ?? t.total ?? 0) > 0), prefix: "aremind_", empty: "Nobody to remind right now 🎉" },
};

/** Tap-to-pick ticket list for quote / paid / balance / remind. Admin-only (guarded by caller). */
export async function pickTicketFor(to, kind, session = null) {
  const cfg = PICK[kind];
  const list = getAllTickets().filter((t) => t.ref && cfg.filter(t)).slice(-9).reverse();
  const titles = { quote: "Send quote", paid: "Confirm payment", balance: "Request balance", remind: "Send reminder" };
  if (!list.length) {
    if (session) session.menu = ["adminmenu"];
    await sendText(to, cfg.empty);
    await sendButtons(to, "Back 👇", [{ id: "adminmenu", title: "1. 👑 Boss Menu" }]);
    return;
  }
  if (session) session.menu = [...list.map((t) => `${cfg.prefix}${t.ref}`), "adminmenu"];
  await sendList(to, `👑 *${titles[kind]}* — tap a ticket 👇`, "Pick ticket", [
    { title: "Tickets", rows: list.map((t, i) => ({ id: `${cfg.prefix}${t.ref}`, title: num(i, t.ref), description: `${t.product || ""} • ${t.total ? formatPrice(t.total) : "quote"} • ${t.status}`.slice(0, 72) })) },
    { title: "More", rows: [{ id: "adminmenu", title: num(list.length, "👑 Boss menu") }] },
  ]);
}

/** Confirm screen before money moves. Admin-only (guarded by caller). */
export async function showPaidConfirm(to, ref, session = null) {
  const t = getTicketByRef(String(ref || "").toUpperCase());
  if (!t) {
    await sendText(to, `❌ No ticket ${ref}.`);
    return;
  }
  const due = t.dueNow ?? t.total ?? 0;
  if (!(due > 0)) {
    await sendText(to, `❌ ${t.ref} has no amount due (status: ${t.status}). Price it first: 👑 menu → 💰 Quote.`);
    return;
  }
  if (session) session.menu = [`apaidgo_${t.ref}`, `apaidamt_${t.ref}`, "adminmenu"];
  await sendButtons(to, `Confirm *${formatPrice(due)}* for *${t.ref}* (${t.product || ""})?\nCustomer: ${t.name || "?"} • Bank ref: ${t.bankRef || "—"}`, [
    { id: `apaidgo_${t.ref}`, title: "1. ✅ Confirm" },
    { id: `apaidamt_${t.ref}`, title: "2. ✏️ Amount" },
    { id: "adminmenu", title: "3. Boss Menu" },
  ]);
}

/** Ask the admin to type the quote amount (digits). Admin-only (guarded by caller). */
export async function askQuoteAmount(to, ref, session) {
  const t = getTicketByRef(String(ref || "").toUpperCase());
  if (!t) {
    await sendText(to, `❌ No ticket ${ref}.`);
    return;
  }
  session.step = "admin_quote_amount";
  session.form = { ref: t.ref };
  await sendButtons(to, `💰 Quote for *${t.ref}* (${t.product || ""}) — reply with the amount in *digits* (e.g. 15000).`, [{ id: "cancel", title: "Cancel" }]);
}

/** Ask the admin to type a custom confirmed amount. Admin-only (guarded by caller). */
export async function askPaidAmount(to, ref, session) {
  const t = getTicketByRef(String(ref || "").toUpperCase());
  if (!t) {
    await sendText(to, `❌ No ticket ${ref}.`);
    return;
  }
  session.step = "admin_paid_amount";
  session.form = { ref: t.ref };
  const due = t.dueNow ?? t.total ?? 0;
  await sendButtons(to, `How much was confirmed for *${t.ref}*?${due ? ` Expected: *${formatPrice(due)}*.` : ""} Reply in *digits*.`, [{ id: "cancel", title: "Cancel" }]);
}

/** Paused chats → tap one to hand back to the bot. Admin-only (guarded by caller). */
export async function showPausedChats(to, session = null) {
  const list = [...paused].slice(-9);
  if (!list.length) {
    if (session) session.menu = ["adminmenu"];
    await sendText(to, "No paused chats — bot is handling everyone 🤖🎉");
    await sendButtons(to, "Back 👇", [{ id: "adminmenu", title: "1. 👑 Boss Menu" }]);
    return;
  }
  if (session) session.menu = [...list.map((p) => `aresume_${p}`), "adminmenu"];
  await sendList(to, "⏸️ *Paused chats* — tap one to hand back to the bot 👇", "Paused chats", [
    { title: "Paused", rows: list.map((p, i) => ({ id: `aresume_${p}`, title: num(i, p) })) },
    { title: "More", rows: [{ id: "adminmenu", title: num(list.length, "👑 Boss menu") }] },
  ]);
}

/** One-screen boss guide. Admin-only (guarded by caller). */
export async function adminHelp(to, session = null) {
  if (session) session.menu = ["adminmenu"];
  await sendText(to, "👑 *Boss quick guide*\n• Send *admin* anytime = this button menu\n• *pending* = orders needing approval\n• Tap ✅ Approve on payment cards\n• Typing still works: /quote /paid /balance /remind /resume");
  await sendButtons(to, "Back 👇", [{ id: "adminmenu", title: "1. 👑 Boss Menu" }]);
}
