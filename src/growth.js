/**
 * Growth features: Flow-form orders + incoming-media handling.
 * - handleFlowDone: customer submitted the one-screen order Flow (type "flow_done",
 *   answers in responseJson) → validate → create ticket → confirm + payment steps.
 * - handleIncomingMedia: customer sent photo/video/receipt/voice note/sticker/
 *   location → thank them + relay files to the admin (API numbers have no inbox,
 *   so receipts must be forwarded to reach a human). A receipt sent while the
 *   bot waits for a bank transaction ID auto-submits the payment for approval.
 */
import { sendText, sendButtons, sendReaction, sendUrlButton, relayMedia } from "./whatsapp.js";
import { saveTicket, resetSession, getSession, getTicketByRef, updateTicket } from "./store.js";
import { findProduct, formatPrice, isRange } from "./catalog.js";
import { paymentsEnabled, createPaymentLink } from "./payments.js";
import { peekReward, consumeReward, recordOrderCredit } from "./rewards.js";
import { sendApprovalCard } from "./admin.js";

const SHOP = () => process.env.SHOP_NAME || "our shop";
const ADMIN = () => process.env.ADMIN_PHONE || "";
const TAGLINE = "Fast. Creative. Affordable. That's The Paragon Way! 💪🏽";
const THRESHOLD = () => Number(process.env.INSTALLMENT_THRESHOLD || 20000);
const depositDue = (total) => (total >= THRESHOLD() ? Math.ceil(total / 2) : total);

/** Customer sent media. Files relay to admin; customer gets a warm ack. */
export async function handleIncomingMedia(from, msg, messageId) {
  const admin = ADMIN();

  if (msg.type === "reaction") return; // silent — no loop on emoji reacts

  if (msg.type === "sticker") {
    await sendReaction(from, messageId, "😄");
    await sendText(from, `Haha nice one 😄\nType *menu* to continue, or *shop* to order.`);
    return;
  }

  if (msg.type === "location") {
    await sendText(
      from,
      `Got your location 📍 — thanks!\nWe're 100% online (no pickup point), so just tell us what you need here. Type *menu* to start 😊\n\n${TAGLINE}`
    );
    if (admin) await sendText(admin, `📍 Location shared by ${from}: ${msg.latitude},${msg.longitude}${msg.name ? ` (${msg.name})` : ""}`);
    return;
  }

  if (msg.type === "contacts") {
    await sendText(from, `Got the contact card 👤 — what should we do with it?\nType *human* and tell us, or *menu* to continue.`);
    return;
  }

  // ---- image / video / audio / document: possible receipt or brief attachment ----
  const label = { image: "photo 📸", video: "video 🎬", audio: "voice note 🎙️", document: "file 📄" }[msg.type] || "file";
  await sendReaction(from, messageId, "👀");

  let relayed = false;
  if (admin && msg.mediaId) {
    try {
      await relayMedia(admin, msg.mediaId, {
        kind: msg.type === "audio" ? "audio" : msg.type === "video" ? "video" : msg.type === "document" ? "document" : "image",
        caption: `📥 ${label} from ${from}${msg.caption ? ` — "${msg.caption}"` : ""}`,
        filename: msg.filename || undefined,
      });
      relayed = true;
    } catch (e) {
      console.error("media relay failed:", e.message);
      await sendText(admin, `📥 ${from} sent a ${label} but relay failed (${e.message}) — ask them to resend it.`);
    }
  }

  // Receipt screenshot while we wait for a bank ID → auto-submit for approval.
  if (msg.type === "image") {
    const session = getSession(from);
    if (session.step === "awaiting_bankref" && session.form?.ref) {
      const ref = session.form.ref;
      const ticket = getTicketByRef(ref);
      resetSession(from);
      if (ticket) {
        updateTicket(ref, { bankRef: msg.caption ? `screenshot: ${msg.caption}`.slice(0, 64) : "receipt screenshot" });
        await sendText(from, `✅ Received! Your receipt for *${ref}* is now with our team — you'll get a confirmation here once approved (usually within minutes ⚡).\n\n${TAGLINE}`);
        if (admin) await sendApprovalCard(admin, getTicketByRef(ref));
        return;
      }
      // ref vanished — fall through to the generic ack below
      await sendText(from, `Got your ${label} ✅\nOur team will confirm here shortly.\n\n${TAGLINE}`);
      return;
    }
  }

  if (msg.type === "audio") {
    await sendText(
      from,
      `Voice note received 🎙️ — we'll listen and reply shortly.\nPrefer typing? Type *menu* and tap through instead 😊\n\n${TAGLINE}`
    );
    return;
  }
  await sendText(
    from,
    `Got your ${label} ✅` +
      (msg.type === "image" ? `\nIf this is your *payment receipt*, also send your order ref (SHOP-XXX) or reply *paid* so we match it fast ⚡` : "") +
      `\n${relayed ? "Our team has it and will confirm here." : "Our team will confirm here shortly."}\n\n${TAGLINE}`
  );
}

/** Flow form submitted → same ticket + payment logic as chat orders. */
export async function handleFlowDone(from, msg) {
  let data = {};
  try {
    data = JSON.parse(msg.responseJson || "{}");
  } catch {
    data = {};
  }
  const productId = String(data.product_id || data.product || "").trim().toUpperCase();
  const p = productId ? findProduct(productId) : null;
  const qty = Math.min(50, Math.max(1, parseInt(data.qty, 10) || 1));
  const name = String(data.name || "").trim();
  const phone = String(data.phone || "").trim();
  const details = String(data.details || data.brief || "").trim();

  if (!p || !name || !phone) {
    await sendText(from, `Hmm, your form came through incomplete 😅\nType *shop* to order in chat instead — same speed, I promise!\n\n${TAGLINE}`);
    if (ADMIN()) await sendText(ADMIN(), `⚠️ Incomplete FLOW submission from ${from}: ${JSON.stringify(data).slice(0, 400)}`);
    return;
  }

  const ref = `SHOP-${Date.now().toString(36).toUpperCase()}${from.slice(-4)}`;
  const form = { kind: "order", via: "flow", productId: p.id, product: p.name, qty, name, phone, details };
  resetSession(from);

  // ---- QUOTE MODE (range-priced services) ----
  if (isRange(p)) {
    const t = saveTicket({ ref, customer: from, status: "awaiting_quote", total: null, paidSoFar: 0, dueNow: null, ...form });
    await recordOrderCredit(from);
    await sendText(
      from,
      `📩 *Request ${ref} received!*\n\n🧾 ${t.product}\n💰 Usual range: *${formatPrice(p.priceMin)} – ${formatPrice(p.priceMax)}*\n👤 ${t.name}\n\nWe'll send your exact price + payment steps here shortly.\n⚠️ Reminder: payment first — work begins after confirmation, by appointment 📅\n\n${TAGLINE}`
    );
    if (ADMIN()) await sendText(ADMIN(), `🆕 *FLOW QUOTE ${ref}*\nFrom: ${from}\nService: ${t.product}\nName: ${t.name}\nPhone: ${t.phone}\nDetails: ${t.details}\n\nSend quote: /quote ${ref} 15000`);
    return;
  }

  // ---- FIXED MODE (rewards auto-apply, 50/50 installments over threshold) ----
  let total = qty * p.price;
  const reward = peekReward(from, p.id, total);
  let rewardLine = "";
  if (reward) {
    total = Math.max(0, total - reward.discount);
    rewardLine = `\n🎁 ${reward.label} applied: *-${formatPrice(reward.discount)}*`;
    consumeReward(from, reward.type);
  }
  // ---- FREE (reward covered everything): auto-confirm, no payment ----
  if (total <= 0) {
    const t = saveTicket({ ref, customer: from, status: "paid", total: 0, price: p.price, paidSoFar: 0, dueNow: 0, rewardApplied: reward.type, ...form });
    await recordOrderCredit(from);
    await sendText(from, `🎉 *Order ${ref} — FREE with your reward!*\n\n🧾 ${t.product}${t.qty > 1 ? ` x${t.qty}` : ""}\n💰 Total: *₦0* — ${reward.label} covered it! 🎁\n👤 ${t.name}\n\nNo payment needed — work is now scheduled 🛠️\n\n${TAGLINE}`);
    if (ADMIN()) {
      await sendText(ADMIN(), `🎁 *FREE REWARD FLOW ${ref}*\nFrom: ${from}\nService: ${t.product} (${t.productId})\nReward: ${reward.type} (auto-applied — customer pays ₦0)\nName: ${t.name}\nPhone: ${t.phone}\n→ Fulfill like a paid order.`);
    }
    const session = getSession(from);
    if (session) session.menu = ["track", "menu"];
    await sendButtons(from, "Track it anytime 👇", [
      { id: "track", title: "1. Track Order" },
      { id: "menu", title: "2. Main Menu" },
    ]);
    return;
  }
  const due = depositDue(total);
  const split = due < total;
  const t = saveTicket({ ref, customer: from, status: "new_order", price: p.price, total, paidSoFar: 0, dueNow: due, rewardApplied: reward ? reward.type : null, ...form });
  await recordOrderCredit(from);
  const summary =
    `🎉 *Order ${ref} received!*\n\n🧾 ${t.product}${t.qty > 1 ? ` x${t.qty}` : ""}` +
    `\n💰 Total: *${formatPrice(total)}*` +
    rewardLine +
    (split ? `\n\n💳 *Installments:* pay *50% deposit (${formatPrice(due)})* to start — balance *${formatPrice(total - due)}* before delivery.` : "") +
    `\n👤 ${t.name}` +
    `\n\n⚠️ Work begins after payment confirmation.`;

  if (paymentsEnabled()) {
    try {
      const link = await createPaymentLink({
        email: `${from}@whatsapp.shop`,
        amountKobo: Math.round(due * 100),
        reference: ref,
        metadata: { phone: from, name: t.name, product: t.product, qty: String(t.qty), via: "flow" },
      });
      await sendText(from, summary);
      await sendUrlButton(
        from,
        `Pay *${formatPrice(due)}*${split ? " deposit" : ""} securely with card, bank transfer or USSD 👇\nWe'll confirm here automatically once it lands ✅\n\n${TAGLINE}`,
        split ? "Pay Deposit" : "Pay Now",
        link.authorization_url,
        { footer: `Ref: ${ref}` }
      );
    } catch (e) {
      console.error("Paystack init failed:", e.message);
      await sendText(from, summary + `\n\n⚠️ Online payment is down right now — we'll message you payment details shortly. Your ref is *${ref}*.\n\n${TAGLINE}`);
    }
  } else {
    const acct = process.env.SHOP_ACCOUNT_DETAILS || "our account details (ask admin to set SHOP_ACCOUNT_DETAILS)";
    await sendText(
      from,
      summary + `\n\n💳 *How to pay:*\nTransfer *${formatPrice(due)}*${split ? " deposit" : ""} (exact amount) to:\n${acct}\nUse *${ref}* as narration/description.\nThen reply *paid* here — we'll verify and start your job ✅\n\n${TAGLINE}`
    );
  }
  if (ADMIN()) {
    await sendText(ADMIN(), `🆕 *FLOW ORDER ${ref}*\nFrom: ${from}\nService: ${t.product} (${t.productId})${t.qty > 1 ? ` x${t.qty}` : ""}\nTotal: ${formatPrice(total)}${reward ? ` (🎁 ${reward.type} -${formatPrice(reward.discount)})` : ""}${split ? ` (deposit ${formatPrice(due)} now)` : ""}\nName: ${t.name}\nPhone: ${t.phone}\nDetails: ${t.details}\nPayment: ${paymentsEnabled() ? "Paystack link sent" : "manual transfer"}`);
  }
  const session = getSession(from);
  if (session) session.menu = ["track", "menu"];
  await sendButtons(from, "Track it anytime 👇", [
    { id: "track", title: "1. Track Order" },
    { id: "menu", title: "2. Main Menu" },
  ]);
}
