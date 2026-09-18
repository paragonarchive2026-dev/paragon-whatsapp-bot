/**
 * Native catalog cart checkout.
 * When a customer browses the Commerce catalog linked to your WABA,
 * adds items to cart and taps Send, Meta delivers a structured
 * `type: "order"` webhook (NOT plain text) with product_items:
 *   [{ product_retailer_id, quantity, item_price, currency }]
 * product_retailer_id is YOUR sku from the feed — we use the same IDs
 * as products.json (T001, W001...), so matching is trivial.
 */
import { sendText, sendButtons, sendUrlButton, sendCatalogMessage } from "./whatsapp.js";
import { findProduct, formatPrice, isRange } from "./catalog.js";
import { saveTicket, resetSession } from "./store.js";
import { paymentsEnabled, createPaymentLink } from "./payments.js";
import { peekCartReward, consumeReward, recordOrderCredit } from "./rewards.js";

const SHOP = () => process.env.SHOP_NAME || "our shop";
const ADMIN = () => process.env.ADMIN_PHONE || "";
const TAGLINE = "Fast. Creative. Affordable. That's The Paragon Way! 💪🏽";
const THRESHOLD = () => Number(process.env.INSTALLMENT_THRESHOLD || 20000);
const depositDue = (total) => (total >= THRESHOLD() ? Math.ceil(total / 2) : total);
const DESIGN_CATS = ["webdesign", "graphics"];

/** sku shown on the storefront button — must exist in the Commerce catalog too. */
const THUMBNAIL_SKU = "T001";

/** Send the native "View catalog" storefront button (needs linked Commerce catalog). */
export async function sendNativeCatalog(to) {
  try {
    await sendCatalogMessage(
      to,
      `🛍️ *${SHOP()} Store*\nTap below to browse, add to cart and send your order — I'll take it from there 😊`,
      THUMBNAIL_SKU,
      "Cart orders get instant checkout"
    );
  } catch (e) {
    console.error("catalog_message failed (catalog not linked yet?):", e.response?.data || e.message);
    await sendText(to, `Our tap-to-cart store is launching soon! Meanwhile type *shop* to browse and order in chat — same prices, same speed 😊\n\n${TAGLINE}`);
    if (ADMIN()) await sendText(ADMIN(), "⚠️ A customer tapped Native Catalog but catalog_message failed — Commerce catalog is not linked to the WABA yet. Link it in Commerce Manager (ask me how).");
  }
}

/** Pure: turn webhook product_items into priced cart lines. Exported for testing. */
export function buildCart(productItems = []) {
  const lines = [];
  const unknown = [];
  for (const it of productItems || []) {
    const sku = String(it.product_retailer_id || "").trim();
    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    if (!sku) continue;
    const p = findProduct(sku);
    if (p && (p.price > 0 || isRange(p))) {
      // Trust OUR catalog price, not the webhook's (reconcile, don't blindly charge).
      lines.push({ sku: p.id, name: p.name, qty, unit: p.price || 0, quote: isRange(p), cat: p.cat, known: true });
    } else {
      unknown.push(sku);
      // WhatsApp's shown price is display-only — unknown items force quote mode.
      lines.push({ sku, name: `Catalog item ${sku}`, qty, unit: Number(it.item_price) || 0, quote: true, cat: "", known: false });
    }
  }
  const fixedTotal = lines.filter((l) => !l.quote).reduce((s, l) => s + l.unit * l.qty, 0);
  return { lines, unknown, fixedTotal, hasQuote: lines.some((l) => l.quote) };
}

function cartText(cart) {
  return cart.lines
    .map((l) =>
      !l.known
        ? `• ${l.qty}x ${l.name} — to confirm`
        : l.quote
          ? `• ${l.qty}x ${l.name} — quote`
          : `• ${l.qty}x ${l.name} — ${formatPrice(l.unit * l.qty)}`
    )
    .join("\n");
}

/** Entry: customer sent a native cart. Summarize + start 3-step checkout. */
export async function startCartCheckout(from, order, session) {
  const cart = buildCart(order?.product_items);
  if (!cart.lines.length) {
    await sendText(from, "I got an empty cart 😅 — type *shop* to browse and order in chat instead.");
    return;
  }
  const knownCount = cart.lines.filter((l) => l.known).length;
  if (!knownCount) {
    // Nothing recognized — hand to a human, never guess.
    const { paused } = await import("./store.js");
    paused.add(from);
    await sendText(from, `Thanks! 🙏 Your cart came through but I need a human to confirm the items — someone will reply shortly.\n\n${TAGLINE}`);
    if (ADMIN()) {
      await sendText(ADMIN(), `🛒 *UNKNOWN CART* from ${from}\nSKUs: ${cart.lines.map((l) => l.sku).join(", ")}\nMatch them to product IDs or fix the Commerce feed, then /resume ${from}.`);
    }
    return;
  }
  session.step = "cart_name";
  session.form = {
    kind: "order",
    productId: "CART",
    product: `Cart (${cart.lines.length} item${cart.lines.length > 1 ? "s" : ""})`,
    cart,
    qty: cart.lines.reduce((s, l) => s + l.qty, 0),
  };
  await sendText(
    from,
    `🛒 *Got your cart!*\n\n${cartText(cart)}` +
      (cart.hasQuote
        ? `\n\n💬 Some items need an exact quote — I'll confirm pricing before any payment.`
        : `\n\n💰 Total: *${formatPrice(cart.fixedTotal)}*`) +
      (cart.unknown.length ? `\n⚠️ Unrecognized: ${cart.unknown.join(", ")} (we'll confirm).` : "") +
      `\n\nStep 1/3: What is your *full name*?`
  );
  if (cart.unknown.length && ADMIN()) {
    await sendText(ADMIN(), `⚠️ Cart from ${from} has unknown SKUs: ${cart.unknown.join(", ")} — check Commerce feed IDs match products.json.`);
  }
}

/** cart_name → cart_phone → cart_details → complete. (cancel/menu handled by caller.) */
export async function handleCartStep(from, session, text) {
  const form = session.form || {};
  if (session.step === "cart_name") {
    form.name = text;
    session.step = "cart_phone";
    await sendText(from, "Step 2/3: What is your *phone number*?");
    return;
  }
  if (session.step === "cart_phone") {
    form.phone = text;
    session.step = "cart_details";
    const cats = (form.cart?.lines || []).map((l) => l.cat).filter(Boolean);
    const hasDesign = cats.some((c) => DESIGN_CATS.includes(c));
    const hasBoost = cats.some((c) => !DESIGN_CATS.includes(c));
    if (hasDesign && !hasBoost) {
      await sendText(from, "Step 3/3: Describe what you want ✍️\n(Business name, style, colors, pages, examples)");
    } else if (hasBoost && !hasDesign) {
      await sendText(from, "Step 3/3: Drop your *username / links* 🔗\n(e.g. TikTok @handle or post links for each item)");
    } else {
      await sendText(from, "Step 3/3: Send your *details* ✍️\n(Links/usernames for boost items + brief for design items)");
    }
    return;
  }
  if (session.step === "cart_details") {
    form.details = text;
    await completeCartOrder(from, session);
  }
}

async function completeCartOrder(from, session) {
  const form = session.form;
  const cart = form.cart;
  const ref = `SHOP-${Date.now().toString(36).toUpperCase()}${from.slice(-4)}`;
  const itemsText = cartText(cart);
  const fullDetails = `${form.details}\n---\n${itemsText}`;

  // ---- QUOTE MODE (range-priced or unrecognized items in cart) ----
  if (cart.hasQuote) {
    const t = saveTicket({ ref, customer: from, status: "awaiting_quote", total: null, paidSoFar: 0, dueNow: null, ...form, details: fullDetails });
    resetSession(from);
    await recordOrderCredit(from);
    await sendText(
      from,
      `📩 *Request ${ref} received!*\n\n${itemsText}\n👤 ${t.name}\n\nWe'll send your exact total + payment link here shortly.\n⚠️ Reminder: payment first — work begins after confirmation, by appointment 📅\n\n${TAGLINE}`
    );
    if (ADMIN()) {
      await sendText(ADMIN(), `🆕 *CART QUOTE ${ref}*\nFrom: ${from}\n${itemsText}\nName: ${t.name}\nPhone: ${t.phone}\nDetails: ${form.details}\n\nSend total: /quote ${ref} 15000`);
    }
    return;
  }

  // ---- FIXED MODE (rewards auto-apply, installments supported) ----
  let total = cart.fixedTotal;
  const reward = peekCartReward(from, cart.lines, total);
  let rewardLine = "";
  if (reward) {
    total = Math.max(0, total - reward.discount);
    rewardLine = `\n🎁 ${reward.label} applied: *-${formatPrice(reward.discount)}*`;
    consumeReward(from, reward.type);
  }
  // ---- FREE (reward covered everything): auto-confirm, no payment ----
  if (total <= 0) {
    const t = saveTicket({ ref, customer: from, status: "paid", total: 0, paidSoFar: 0, dueNow: 0, rewardApplied: reward.type, ...form, details: fullDetails });
    resetSession(from);
    await recordOrderCredit(from);
    await sendText(from, `🎉 *Order ${ref} — FREE with your reward!*\n\n${itemsText}\n💰 Total: *₦0* — ${reward.label} covered it! 🎁\n👤 ${t.name}\n\nNo payment needed — work is now scheduled 🛠️\n\n${TAGLINE}`);
    if (ADMIN()) {
      await sendText(ADMIN(), `🎁 *FREE REWARD CART ${ref}*\nFrom: ${from}\n${itemsText}\nReward: ${reward.type} (auto-applied — customer pays ₦0)\nName: ${t.name}\nPhone: ${t.phone}\n→ Fulfill like a paid order.`);
    }
    if (session) session.menu = ["track", "menu"];
    await sendButtons(from, "Track it anytime 👇", [
      { id: "track", title: "1. Track Order" },
      { id: "menu", title: "2. Main Menu" },
    ]);
    return;
  }
  const due = depositDue(total);
  const split = due < total;
  const t = saveTicket({ ref, customer: from, status: "new_order", total, paidSoFar: 0, dueNow: due, rewardApplied: reward ? reward.type : null, ...form, details: fullDetails });
  resetSession(from);
  await recordOrderCredit(from);
  const summary =
    `🎉 *Order ${ref} received!*\n\n${itemsText}` +
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
        metadata: { phone: from, name: t.name, product: t.product, kind: "cart" },
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
    await sendText(ADMIN(), `🆕 *CART ORDER ${ref}*\nFrom: ${from}\n${itemsText}\nTotal: ${formatPrice(total)}${reward ? ` (🎁 ${reward.type} -${formatPrice(reward.discount)})` : ""}${split ? ` (deposit ${formatPrice(due)} now)` : ""}\nName: ${t.name}\nPhone: ${t.phone}\nDetails: ${form.details}\nPayment: ${paymentsEnabled() ? "Paystack link sent" : "manual transfer"}`);
  }
  if (session) session.menu = ["track", "menu"];
  await sendButtons(from, "Track it anytime 👇", [
    { id: "track", title: "1. Track Order" },
    { id: "menu", title: "2. Main Menu" },
  ]);
}
