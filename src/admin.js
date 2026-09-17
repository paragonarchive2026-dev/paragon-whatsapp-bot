/**
 * In-chat admin console: tap-to-approve payments + pending dashboard.
 * Customer submits their bank transaction ID → admin gets an approval card
 * with [Approve] [Decline] [View] → tap Approve → ticket confirmed + customer
 * auto-notified. "pending" shows the live dashboard; tapping any order opens
 * it with the same buttons. /paid still works as the typing alternative.
 * ALL actions are sender-guarded: only ADMIN_PHONE can use them.
 */
import { sendText, sendButtons, sendList, sendReaction } from "./whatsapp.js";
import { getTicketByRef, updateTicket, getAllTickets, resetSession } from "./store.js";
import { formatPrice } from "./catalog.js";

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
    await sendText(from, `❌ ${ticket.ref} has no amount due (status: ${ticket.status}). Price it with /quote first, or confirm a custom amount: /paid ${ticket.ref} <amount>.`);
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
      `\n\nTap to decide 👇 (wrong amount? use /paid ${ticket.ref} <amount> instead)`
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
