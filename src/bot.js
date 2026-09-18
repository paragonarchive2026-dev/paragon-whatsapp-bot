import { sendText, sendButtons, sendList, sendImage, sendUrlButton, sendTemplate, sendReaction, sendSticker, sendFlowMessage, markAsRead } from "./whatsapp.js";
import { findOrder, saveTicket, getSession, resetSession, paused, getTicketByRef, updateTicket, getTicketsByCustomer, getLatestTicketByCustomer } from "./store.js";
import {
  getCategories, getProductsByCategory, findProduct, formatPrice, formatPriceFor,
  isRange, paginate, searchProducts, PAGE_SIZE,
} from "./catalog.js";
import { paymentsEnabled, createPaymentLink } from "./payments.js";
import { startCartCheckout, handleCartStep, sendNativeCatalog } from "./cart.js";
import { handleProofAction } from "./proof.js";
import { handleFlowDone, handleIncomingMedia } from "./growth.js";
import { getOrCreateCode, parseCode, shareLink, recordJoin, recordOrderCredit, peekReward, consumeReward, rewardsSummary, recordAcquisition } from "./rewards.js";
import { confirmTicketPayment, handleApprove, handleDeclineStart, handleDeclineReason, sendApprovalCard, showPendingDashboard, showTicketAdmin, showAdminMenu, showAdminMore, pickTicketFor, showPaidConfirm, askQuoteAmount, askPaidAmount, showPausedChats, adminHelp, sendQuoteNow, sendBalanceNow, sendRemindNow, resumeChat, reportPaidResult, depositDue, notifyHandover, enterReplyMode, showPausedChat, showDeliverConfirm, deliverTicket, sendDeclineNow } from "./admin.js";

const SHOP = () => process.env.SHOP_NAME || "our shop";
const ADMIN = () => process.env.ADMIN_PHONE || "";
const TAGLINE = "Fast. Creative. Affordable. That's The Paragon Way! 💪🏽";

// Design services (custom brief) vs boost packs (username/link)
const DESIGN_CATS = ["webdesign", "graphics"];
const PACK_CATS = ["tiktok", "instagram", "youtube", "twitter", "facebook", "telegram", "traffic", "bundles"];

// Installments: depositDue lives in admin.js (shared with the boss console).

// ---- Numbered menus: every option shows "1. ..." and typing the number works ----
// (unicode-safe slicing: never splits an emoji in half)
const uslice = (s, n) => [...String(s || "")].slice(0, n).join("");
// Amounts typed by humans: tolerate <5000>, ₦10,000, "10,000" — our own examples
// show <amount>, so people copy the brackets. Strip everything but digits.
const cleanAmount = (s) => {
  const n = parseInt(String(s || "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : NaN;
};
const num = (i, title, max = 24) => `${i + 1}. ${uslice(title, max - `${i + 1}. `.length)}`;
function setMenu(session, ids) {
  if (session) session.menu = ids;
}

// ---- FAQs (Paragon Hub's real answers) ----
const FAQS = {
  delivery:
    `⏱️ *Delivery times*\n\n📱 *Social media boost:* 1–8 hours!\n🎨 *Graphic design:* 1–7 days depending on the job!\n🌐 *Website design:* 1 day – 2 months depending on complexity!\n\n• Flyer/Banner: same day • Logo: 1–3 days • Brand package: 1 week\n• Landing page: 1–2 days • Basic site: 1–2 weeks • Business site: 2–4 weeks • E-commerce: 1–2 months\n\n⚠️ All jobs by appointment only!\nReply *menu* to go back.\n\n${TAGLINE}`,
  returns:
    `✅ *Refund policy:*\n• Order not delivered = Full refund\n• Not satisfied = Free redo (1–2 times)\n• Successfully delivered = No refund\n\n✅ *Revisions:*\n• 1–2 free revisions per design order\n• Extra revisions attract a small fee\n\n✅ *Cancellation:*\n• Before work starts = Full refund\n• During work = 50% refund only\n• After delivery = No refund\n\n📩 Issues? Type *human* — we always resolve them! 🔥\nReply *menu* to go back.\n\n${TAGLINE}`,
  payment:
    `💳 *Payment (read this!)*\n• ⚠️ Payment BEFORE work begins — no exceptions\n• Below ₦20,000 = full payment upfront\n• Above ₦20,000 = 50% deposit to start, 50% before delivery\n• Pay online: card, transfer or USSD via the link we send\n• Or manual transfer (exact amount, use ref as narration), then reply *paid*\n• Boost jobs start instantly–8h after confirmation\n\nReply *menu* to go back.\n\n${TAGLINE}`,
  product:
    `🛍️ *Our services*\n• 🌐 Websites • 🎨 Graphics • 📱 Boost on TikTok, Instagram, YouTube, X, Facebook & Telegram • 🌍 Traffic • 🎁 Bundles\n\nType *shop* to browse, *proof* for past-work samples, or *find* + keyword (e.g. *find logo*, *find followers*).\nReply *menu* to go back, or *human* for a person.\n\n${TAGLINE}`,
  safety:
    `🔒 *Is my account safe? Will it get banned?*\n\nYes — 100% safe! We NEVER ask for your password! We only need your public profile link or username. We use safe methods that don't violate platform policies and deliver gradually so it looks natural!\n\nReply *menu* to go back, or *human* for more assurance 😊\n\n${TAGLINE}`,
  real:
    `✅ *Are the followers/likes real?*\n\nYes! Paragon Hub delivers real engagement! We have before & after proof from past clients — we can show you results before you order!\n\nType *proof* to see samples now, or *human* to chat 👀\n\n${TAGLINE}`,
  custom:
    `🎨 *Custom packages?*\n\nAbsolutely — we love custom orders! Just tell us the platform, the services and how many you need, and we'll create a custom quote specifically for you!\n\nType *human* to start your custom order 🙌\n\n${TAGLINE}`,
  discounts:
    `🎁 *Discounts & referral rewards — AUTOMATIC!*\n\n• Refer 1 person = 10% off your next order!\n• Refer 3 people = FREE Starter Package on any platform!\n• Refer 5 people = FREE Growth Package on any platform!\n\nNo claiming, no typing codes — rewards apply themselves at checkout 🎉\n\nTap below to get your code 👇\n\n${TAGLINE}`,
};

const FAQ_TOPICS = [
  { id: "faq_delivery", title: "Delivery times" },
  { id: "faq_payment", title: "Payment help" },
  { id: "faq_safety", title: "Account safety" },
  { id: "faq_real", title: "Real engagement?" },
  { id: "faq_custom", title: "Custom packages" },
  { id: "faq_discounts", title: "Discounts & referrals" },
  { id: "proof", title: "See proof & past work" },
  { id: "faq_product", title: "Our services" },
  { id: "faq_returns", title: "Refunds & revisions" },
  { id: "feedback", title: "Give feedback 💡" },
  { id: "appoint", title: "How appointments work" },
  { id: "refer", title: "Refer & earn 🎁" },
];

const APPOINTMENT_INFO =
  `📅 *Appointments — how ordering works*\n\n1️⃣ Order in chat (type *shop*)\n2️⃣ Pay first — full payment, or 50% deposit for orders above ₦20,000 ⚠️\n3️⃣ We schedule + start your job\n\n📱 Boost jobs start instantly–8h after payment.\n🎨🌐 Design jobs are scheduled in order of payment.\n\nType *shop* to start, or *human* to talk to us.\n\n${TAGLINE}`;

// Every FAQ answer ends with tap-buttons so nobody needs to type.
const FAQ_BUTTONS = {
  delivery: [
    { id: "track", title: "1. Track Order" },
    { id: "human", title: "2. Talk to Human" },
    { id: "menu", title: "3. Main Menu" },
  ],
  returns: [
    { id: "track", title: "1. Track Order" },
    { id: "human", title: "2. Talk to Human" },
    { id: "menu", title: "3. Main Menu" },
  ],
  payment: [
    { id: "track", title: "1. Track Order" },
    { id: "human", title: "2. Talk to Human" },
    { id: "menu", title: "3. Main Menu" },
  ],
  product: [
    { id: "shop", title: "1. 🛍️ Shop Now" },
    { id: "proof", title: "2. See Proof" },
    { id: "human", title: "3. Human" },
  ],
  safety: [
    { id: "proof", title: "1. See Proof" },
    { id: "shop", title: "2. 🛍️ Shop Now" },
    { id: "human", title: "3. Human" },
  ],
  real: [
    { id: "proof", title: "1. See Proof" },
    { id: "shop", title: "2. 🛍️ Shop Now" },
    { id: "human", title: "3. Human" },
  ],
  custom: [
    { id: "human", title: "1. Talk to Human" },
    { id: "proof", title: "2. See Proof" },
    { id: "menu", title: "3. Main Menu" },
  ],
  discounts: [
    { id: "refer", title: "1. Get My Code" },
    { id: "rewards", title: "2. My Rewards" },
    { id: "menu", title: "3. Main Menu" },
  ],
  appoint: [
    { id: "shop", title: "1. 🛍️ Shop Now" },
    { id: "human", title: "2. Talk to Human" },
    { id: "menu", title: "3. Main Menu" },
  ],
};

async function sendFaq(to, key, session = null) {
  const body = key === "appoint" ? APPOINTMENT_INFO : FAQS[key];
  await sendText(to, body);
  const btns = FAQ_BUTTONS[key] || FAQ_BUTTONS.product;
  setMenu(session, btns.map((b) => b.id));
  await sendButtons(to, "What next? 👇", btns, { footer: "Tap or reply 1, 2, 3" });
}

function ticketStatusText(t) {
  switch (t.status) {
    case "new_order":
      return "Received — awaiting your payment ⏳\n(Pay via your payment link, or transfer + reply *paid*)";
    case "quoted":
      return `Quote sent: *${formatPrice(t.total)}* — awaiting your payment 💳`;
    case "paid":
      return "Paid ✅ — work scheduled / in progress 🛠️";
    case "delivered":
      return "Delivered 🎉 — enjoy! Loved it? Tap *refer* and earn rewards for every friend you send us 🙏";
    case "deposit_paid": {
      const total = t.total || 0;
      const paid = t.paidSoFar || 0;
      const bal = Math.max(0, total - paid);
      return total
        ? `Deposit paid ✅ — work in progress 🛠️\nPaid *${formatPrice(paid)}* of *${formatPrice(total)}* — balance *${formatPrice(bal)}* due before delivery.`
        : "Part payment received ✅ — work in progress 🛠️";
    }
    case "awaiting_quote":
      return "Received — exact quote coming soon 💬";
    case "open":
      return "Complaint open — our team is on it 🛠️";
    default:
      return `Status: ${t.status}`;
  }
}

async function trackLookup(to, code, session = null) {
  const c = String(code || "").trim().toUpperCase();
  const ticket = getTicketByRef(c);
  let body;
  if (ticket) {
    body =
      `📦 *Order ${ticket.ref}*\n🧾 ${ticket.product}${ticket.qty > 1 ? ` x${ticket.qty}` : ""}` +
      `${ticket.total ? `\n💰 ${formatPrice(ticket.total)}` : ""}\n📌 ${ticketStatusText(ticket)}\n\n${TAGLINE}`;
  } else {
    const order = findOrder(c);
    body = order
      ? `📦 *Order ${order.id}*\nStatus: *${order.status}*\n${order.detail || ""}\nETA: ${order.eta || "—"}\n\n${TAGLINE}`
      : `Hmm, I can't find *${c}* 🤔\nCheck the ref (looks like SHOP-XXXX) and try again, or talk to us below 👇\n\n${TAGLINE}`;
  }
  await sendText(to, body);
  setMenu(session, ["menu", "human"]);
  await sendButtons(to, "Anything else? 👇", [
    { id: "menu", title: "1. Main Menu" },
    { id: "human", title: "2. Talk to Human" },
  ]);
}

// "Paid!" with smart matching: 0 open orders → settled-or-generic ack;
// 1 → auto-named + bank-ref ask; 2+ → tap-to-pick list → bank-ref ask.
async function handlePaidClaim(from, session, messageId) {
  await sendReaction(from, messageId, "✅");
  const unpaid = getTicketsByCustomer(from).filter((t) => t.ref && ["new_order", "quoted", "deposit_paid"].includes(t.status));
  if (!unpaid.length) {
    const mine = getTicketsByCustomer(from).filter((t) => t.ref);
    const awaiting = mine.filter((t) => t.status === "awaiting_quote");
    if (awaiting.length) {
      const t = awaiting[awaiting.length - 1];
      await sendText(from, `Not yet — your price quote for *${t.ref}* (${t.product}) isn't ready 🕐\nWe'll send your exact price + pay steps here the moment it's ready. No need to pay before then 🙏\n\n${TAGLINE}`);
      if (ADMIN()) await sendText(ADMIN(), `💰 ${from} tried to PAY ${t.ref} but no quote sent yet — send it now: /quote ${t.ref} 15000 (or *admin* → 💰 Quote)`);
      return;
    }
    if (mine.length) {
      await sendText(from, `Good news — your orders here all look settled ✅\nIf you just paid for something new, send the order ref (SHOP-XXX) so I match it right 🙏\n\n${TAGLINE}`);
    } else {
      await sendText(from, `Got it — we're verifying your payment now 🔎\nIf you used your order ref as narration, it clears faster.\nYou'll get a confirmation here once it lands ✅\n\n${TAGLINE}`);
    }
    if (ADMIN()) await sendText(ADMIN(), `🔔 ${from} says they've PAID (no open orders on this number). Verify in bank app, then /paid <ref> [amount] (or *admin* → Confirm payment).`);
    return;
  }
  if (unpaid.length === 1) {
    const t = unpaid[0];
    await sendText(from, `Noted for *${t.ref}* (${t.product}) ✅`);
    await askBankRef(from, session, t.ref);
    return;
  }
  const list = unpaid.slice(-8);
  setMenu(session, [...list.map((t) => `paidfor_${t.ref}`), "menu"]);
  await sendList(from, `Which order did you pay for? 👇 (just tap — no typing!)`, "Pick order", [
    {
      title: "Your open orders",
      rows: list.map((t, i) => ({
        id: `paidfor_${t.ref}`,
        title: num(i, t.ref),
        description: uslice(`${t.product || ""} • ${t.total ? formatPrice(t.total) : "quote"}`, 72),
      })),
    },
    { title: "More", rows: [{ id: "menu", title: num(list.length, "Main menu") }] },
  ]);
}

async function confirmPaidFor(from, ref, session) {
  const t = getTicketByRef(ref);
  if (!t) {
    await sendText(from, "Hmm, that order vanished 😅 — type *menu* and try again.");
    return;
  }
  await sendText(from, `Noted for *${t.ref}* (${t.product}) ✅`);
  await askBankRef(from, session, t.ref);
}

// WhatsApp has no popup/input-dialog API — this one-tap prompt + Skip button
// is the closest UX (and faster than opening a Flow for a single field).
async function askBankRef(to, session, ref) {
  session.step = "awaiting_bankref";
  session.form = { kind: "paid_claim", ref };
  await sendButtons(to, `One more thing for *${ref}* — send your bank *transaction ID / session ID* (from your receipt or bank SMS) 👇\nThis gets you approved in seconds ⚡`, [
    { id: "skip", title: "Skip" },
  ]);
}

// ================= MAIN MENU =================
export async function showMenu(to, session = null) {
  setMenu(session, ["shop", "track", "faqs"]);
  const known = getLatestTicketByCustomer(to);
  const hello = known?.name ? `Welcome back, ${String(known.name).split(" ")[0]}! 👋` : `Hi 👋 Welcome to *${SHOP()}*! 😊`;
  await sendButtons(
    to,
    `${hello}\nWebsites, graphics & social media boost — how can I help?\n\n${TAGLINE}`,
    [
      { id: "shop", title: "1. 🛍️ Shop" },
      { id: "track", title: "2. Track Order" },
      { id: "faqs", title: "3. Help / FAQs" },
    ],
    { header: "✨ PARAGON HUB ✨", footer: "Tap a button or reply 1, 2, 3" }
  );
}

async function showFaqList(to, page = 0, session = null) {
  const perPage = 7;
  const totalPages = Math.ceil(FAQ_TOPICS.length / perPage);
  const slice = FAQ_TOPICS.slice(page * perPage, page * perPage + perPage);
  const rows = slice.map((t, i) => ({ id: t.id, title: num(i, t.title) }));
  const nav = [];
  if (page < totalPages - 1) nav.push({ id: `faqs_more_${page + 1}`, title: "More topics ➡️" });
  if (page > 0) nav.push({ id: "faqs_back", title: "← Back to topics" });
  nav.push({ id: "complain", title: "File a complaint" });
  nav.push({ id: "human", title: "Talk to a human" });
  const navNumbered = nav.map((r, j) => ({ ...r, title: num(slice.length + j, r.title) }));
  setMenu(session, [...slice.map((t) => t.id), ...nav.map((r) => r.id)]);
  await sendList(
    to,
    `Pick a help topic 👇\nReply with the number or tap (page ${page + 1}/${totalPages})`,
    "View topics",
    [
      { title: "Help topics", rows },
      { title: "More", rows: navNumbered },
    ]
  );
}

// ================= TAP-TO-TRACK (no typing your ref) =================
const statusIcon = (t) =>
  t.status === "paid" ? "Paid ✅"
  : t.status === "delivered" ? "Delivered 🎉"
  : t.status === "deposit_paid" ? "Deposit paid ⏳"
  : t.status === "quoted" ? "Quoted 💬"
  : t.status === "awaiting_quote" ? "Quote soon 💬"
  : t.status === "new_order" ? "Awaiting payment ⏳"
  : t.status;

async function showMyOrders(to, session = null) {
  const mine = getTicketsByCustomer(to).filter((t) => t.ref);
  if (!mine.length) {
    session.step = "awaiting_order_lookup";
    setMenu(session, ["human", "menu"]);
    await sendButtons(to, "You have no orders on this number yet 🙂\nIf you ordered with a different number, send the *Order ref* (e.g. SHOP-XXXX):", [
      { id: "human", title: "1. Talk to Human" },
      { id: "menu", title: "2. Main Menu" },
    ]);
    return;
  }
  const recent = mine.slice(-7).reverse();
  setMenu(session, [...recent.map((t) => `track_${t.ref}`), "track_manual", "menu"]);
  await sendList(to, `📦 *Your orders* — tap one to track 👇`, "View orders", [
    {
      title: "Your orders",
      rows: recent.map((t, i) => ({
        id: `track_${t.ref}`,
        title: num(i, t.ref),
        description: uslice(`${t.product || ""} • ${t.total ? formatPrice(t.total) : "quote"} • ${statusIcon(t)}`, 72),
      })),
    },
    {
      title: "More",
      rows: [
        { id: "track_manual", title: num(recent.length, "Enter ref manually") },
        { id: "menu", title: num(recent.length + 1, "Main menu") },
      ],
    },
  ]);
}

// ================= REFERRALS (boss screens; logic in rewards.js) =================
async function showRefer(to, session = null) {
  const code = getOrCreateCode(to);
  const link = shareLink(to);
  setMenu(session, ["rewards", "menu"]);
  await sendText(
    to,
    `🎁 *Refer & earn — it runs itself!*\n\nYour code: *${code}*\n\nHow it works:\n1️⃣ Share your link (friend taps → presses send, no typing!)\n2️⃣ Friend places their first order → counted automatically\n3️⃣ Rewards apply themselves at YOUR checkout:\n   • 1 friend → 10% off\n   • 3 friends → FREE Starter (any platform)\n   • 5 friends → FREE Growth (any platform)\n\n${link ? `📤 Your share link:\n${link}` : `📤 Tell friends to message us and send: *${code}*`}\n\n${TAGLINE}`
  );
  await sendButtons(to, "Check your progress 👇", [
    { id: "rewards", title: "1. My Rewards" },
    { id: "menu", title: "2. Main Menu" },
  ]);
}

async function showRewards(to, session = null) {
  setMenu(session, ["shop", "refer", "menu"]);
  await sendText(to, rewardsSummary(to));
  await sendButtons(to, "Use your rewards 👇", [
    { id: "shop", title: "1. 🛍️ Shop Now" },
    { id: "refer", title: "2. Refer More" },
    { id: "menu", title: "3. Main Menu" },
  ]);
}

// ================= CATALOG / SHOP =================
async function showCategories(to, page = 0, session = null) {
  const cats = getCategories();
  if (!cats.length) {
    await sendText(to, "Our catalogue is being updated — type *human* and we'll send you today's list directly 🙏");
    return;
  }
  const { items, hasMore, totalPages } = paginate(cats, page, PAGE_SIZE);
  const rows = items.map((c, i) => ({
    id: `cat_${c.id}`,
    title: num(i, c.title),
    description: `${getProductsByCategory(c.id).length} item(s)`,
  }));
  const navRaw = [
    ...(page === 0 ? [{ id: "native_catalog", title: "🛒 Native catalog + cart" }] : []),
    ...(hasMore ? [{ id: `cats_more_${page + 1}`, title: "More categories ➡️" }] : []),
    { id: "search", title: "🔎 Search catalogue" },
  ];
  const nav = navRaw.map((r, j) => ({ ...r, title: num(items.length + j, r.title) }));
  setMenu(session, [...items.map((c) => `cat_${c.id}`), ...navRaw.map((r) => r.id)]);
  await sendList(
    to,
    `🛍️ *${SHOP()} Catalogue*\nPick a category (page ${page + 1}/${totalPages}) — reply with the number or tap 👇`,
    "Categories",
    [
      { title: "Shop by category", rows },
      { title: "More", rows: nav },
    ]
  );
}

function rowDesc(p) {
  const priceLine = isRange(p) ? `${formatPriceFor(p)} (quote)` : formatPriceFor(p);
  const low = p.stock != null && p.stock > 0 && p.stock <= 5 ? ` • Only ${p.stock} left!` : "";
  return uslice(`${priceLine}${low}`, 72);
}

async function showProducts(to, catId, page = 0, session = null) {
  const cats = getCategories();
  const cat = cats.find((c) => c.id === catId);
  const all = getProductsByCategory(catId);
  if (!all.length) {
    await sendText(to, "No items in this category yet. Type *shop* to see other categories.");
    return;
  }
  const { items, hasMore, totalPages } = paginate(all, page, PAGE_SIZE);
  const rows = items.map((p, i) => ({
    id: `prod_${p.id}`,
    title: num(i, p.name),
    description: rowDesc(p),
  }));
  const navRaw = [
    ...(hasMore ? [{ id: `prods_${catId}_more_${page + 1}`, title: "More items ➡️" }] : []),
    { id: "shop", title: "← Back to categories" },
    { id: "search", title: "🔎 Search instead" },
  ];
  const nav = navRaw.map((r, j) => ({ ...r, title: num(items.length + j, r.title) }));
  setMenu(session, [...items.map((p) => `prod_${p.id}`), ...navRaw.map((r) => r.id)]);
  await sendList(
    to,
    `*${cat?.title || "Items"}* — page ${page + 1}/${totalPages}\nReply with the number or tap 👇`,
    "View items",
    [
      { title: (cat?.title || "Items").slice(0, 24), rows },
      { title: "More", rows: nav },
    ]
  );
}

async function showProduct(to, prodId, session = null) {
  const p = findProduct(prodId);
  if (!p) {
    await sendText(to, "Item not found — type *shop* to browse again.");
    return;
  }
  const lines = [
    `*${p.name}*`,
    isRange(p) ? `💰 Price: *${formatPriceFor(p)}* (exact quote after your details)` : `💰 Price: *${formatPriceFor(p)}*`,
    ...(p.sizes?.length ? [`📏 Options: ${p.sizes.join(", ")}`] : []),
    `📦 Availability: ${p.stock === 0 ? "Out of stock" : "Available ✅"}`,
    "",
    p.desc || "",
    "",
    `Service code: ${p.id}`,
    "",
    TAGLINE,
  ];
  const detail = lines.join("\n");
  if (p.image && p.image.startsWith("http")) {
    try {
      await sendImage(to, p.image, detail);
    } catch {
      await sendText(to, detail);
    }
  } else {
    await sendText(to, detail);
  }
  if (p.stock === 0) {
    setMenu(session, ["shop", "human"]);
    await sendButtons(to, "This service is unavailable right now 😔", [
      { id: "shop", title: "1. Back to Shop" },
      { id: "human", title: "2. Ask Us" },
    ]);
    return;
  }
  setMenu(session, [`order_${p.id}`, "shop", "human"]);
  await sendButtons(to, isRange(p) ? "Want a quote for this? 😊" : "Want this? 😊", [
    { id: `order_${p.id}`, title: isRange(p) ? "1. Get Quote" : "1. Order This" },
    { id: "shop", title: "2. Back to Shop" },
    { id: "human", title: "3. Ask Question" },
  ]);
}

async function showSearchResults(to, query, session = null) {
  const results = searchProducts(query, 8);
  if (!results.length) {
    await sendText(to, `No match for "*${query}*" 😅\nTry fewer words (e.g. *find logo*) or type *shop* to browse categories.`);
    return;
  }
  setMenu(session, [...results.map((p) => `prod_${p.id}`), "shop"]);
  await sendList(
    to,
    `🔎 Results for "*${query}" — reply with the number or tap:`,
    "View results",
    [
      {
        title: "Matches",
        rows: results.map((p, i) => ({
          id: `prod_${p.id}`,
          title: num(i, p.name),
          description: uslice(`${rowDesc(p)} • ${p.id}`, 72),
        })),
      },
      { title: "More", rows: [{ id: "shop", title: num(results.length, "← Back to categories") }] },
    ]
  );
}

async function startOrder(to, session, prodId) {
  const p = findProduct(prodId);
  if (!p) {
    await sendText(to, "Item not found — type *shop* to browse again.");
    return;
  }
  if (isRange(p)) {
    // QUOTE MODE: skip quantity, collect name → phone → brief
    session.form = { kind: "order", productId: p.id, product: p.name, price: 0, qty: 1, isQuote: true, priceMin: p.priceMin, priceMax: p.priceMax };
    await maybeAskIdentity(to, session, `Great choice! 🛒 *${p.name}*\nUsually *${formatPriceFor(p)}* — exact quote after your details.\n\nStep 1/3: `);
    return;
  }
  session.step = "order_qty";
  session.form = { kind: "order", productId: p.id, product: p.name, price: p.price, isQuote: false };
  const packs = PACK_CATS.includes(p.cat);
  await sendText(to, `Great choice! 🛒 *${p.name}* — ${formatPrice(p.price)}${packs ? " per pack" : ""}\n\nStep 1/4: How many ${packs ? "packs" : "units"}? (send a number)`);
}

// Returning customer? Offer their saved name/phone in one tap (else ask normally).
async function maybeAskIdentity(to, session, intro) {
  const known = getLatestTicketByCustomer(to);
  if (known?.name && known?.phone) {
    session.step = "order_confirm_identity";
    session.form.savedName = known.name;
    session.form.savedPhone = known.phone;
    await sendButtons(to, `${intro}Ordering as *${known.name}* (${known.phone})? 👇`, [
      { id: "order_use_saved", title: "1. Yes, that's me" },
      { id: "order_new_identity", title: "2. Use different" },
    ]);
    return;
  }
  session.step = "order_name";
  await sendText(to, `${intro}What is your *full name*?`);
}

async function askOrderDetails(to, session, stepLabel) {
  const p = findProduct(session.form.productId);
  if (p && DESIGN_CATS.includes(p.cat)) {
    await sendText(to, `${stepLabel}: Describe what you want ✍️\n(Business name, style, colors, pages, examples — the more detail the better)`);
  } else {
    await sendText(to, `${stepLabel}: Drop your *username / link* 🔗\n(e.g. TikTok @handle or post link, IG @handle, YouTube link, website URL) + anything we should know`);
  }
}

// ================= COMPLAINT FORM =================
async function startComplaint(to, session, kind = "complaint") {
  session.step = "awaiting_name";
  session.form = { kind };
  const what = kind === "feedback" ? "💡 Filing a *feedback ticket*" : "📝 Filing a *complaint ticket*";
  const sorry = kind === "feedback" ? "We love feedback — let's record yours 🙏" : "Sorry about that — let's fix it 🙏";
  await sendText(to, `${sorry}\n\n${what} (Step 1/4): What is your *full name*?\n(Type *cancel* anytime to stop)`);
}

/**
 * Main entry: handle one incoming user message.
 */
export async function handleIncoming(from, msg, messageId) {
  if (messageId) await markAsRead(messageId);

  // ---- Admin commands (from your own number) ----
  if (ADMIN() && from === ADMIN() && msg.text?.startsWith("/")) {
    resetSession(from); // typing any /command also exits boss reply-mode
    const [cmd, target, extra] = msg.text.trim().split(/\s+/);
    if (cmd === "/resume" && target) {
      await resumeChat(from, target);
      return;
    }
    if (cmd === "/quote" && target) {
      await sendQuoteNow(from, target, cleanAmount(extra));
      return;
    }
    if (cmd === "/balance" && target) {
      await sendBalanceNow(from, target);
      return;
    }
    if (cmd === "/paid" && target) {
      const ticket = getTicketByRef(String(target).toUpperCase());
      if (!ticket) {
        await sendText(from, `❌ No ticket ${target}.`);
        return;
      }
      if (!["new_order", "quoted", "deposit_paid", "awaiting_quote"].includes(ticket.status)) {
        await sendText(from, `❌ ${ticket.ref} isn't payable (status: ${ticket.status}).`);
        return;
      }
      const total = ticket.total || 0;
      const amt = extra ? cleanAmount(extra) : (ticket.dueNow ?? total);
      if (!amt || amt <= 0) {
        await sendText(from, "❌ Specify amount: /paid SHOP-XXX 15000");
        return;
      }
      await reportPaidResult(from, ticket, amt);
      return;
    }
    if (cmd === "/remind" && target) {
      await sendRemindNow(from, target);
      return;
    }
    if (cmd === "/deliver" && target) {
      await deliverTicket(from, target);
      return;
    }
    await sendText(from, "Admin commands:\n/resume <number> — hand chat back to bot\n/quote <ref> <amount> — send exact quote + payment link\n/paid <ref> [amount] — confirm a manual payment\n/balance <ref> — send balance payment link\n/remind <ref> — resend payment reminder (needs approved template)\n/deliver <ref> — mark a paid order delivered\n(or tap ✅ Approve on payment cards / type *pending* — or send *admin* for the 👑 button menu)");
    return;
  }

  // Admin typed a command mid-sentence ("quote: /quote SHOP-X ...")? Point at the
  // format instead of letting it fall through to track-lookup.
  if (ADMIN() && from === ADMIN() && !(msg.buttonId || msg.listId) && getSession(from).step === "idle" && /\/(quote|paid|balance|remind|resume|deliver)\b/.test(msg.text || "")) {
    const mref = (msg.text || "").match(/SHOP-[A-Z0-9]+/i);
    await sendText(from, `Almost! Admin commands must START with / (nothing before it). Try:\n/quote ${mref ? mref[0].toUpperCase() : "SHOP-XXX"} 15000\n(no < > brackets — plain digits only)`);
    return;
  }

  // ---- Human takeover: bot stays silent, forwards to admin ----
  if (paused.has(from)) {
    if (ADMIN()) {
      const preview = msg.type === "order"
        ? `🛒 CART sent (${msg.order?.product_items?.length || 0} items)`
        : (msg.text || msg.buttonId || msg.listId || "(media)");
      await notifyHandover(ADMIN(), from, `💬 *Customer ${from}* (bot paused):`, preview);
    }
    return;
  }

  let session = getSession(from);
  const text = (msg.text || "").trim();
  const lower = text.toLowerCase();
  let actionId = msg.buttonId || msg.listId || "";
  const adminOK = ADMIN() && from === ADMIN();

  // Ads first-touch attribution (stored silently, never blocks chat)
  if (msg.referral) recordAcquisition(from, msg.referral);

  // ---- Numbered replies ("1"–"10" pick from the last menu shown; idle chats only,
  //      so digits never clash with quantity / phone / order-ref inputs) ----
  if (session.step === "idle" && /^\d{1,2}$/.test(text) && session.menu?.length) {
    const n = parseInt(text, 10);
    if (n >= 1 && n <= session.menu.length) actionId = session.menu[n - 1];
  }

  // ---- Native catalog cart sent by customer → cart checkout (interrupts any form) ----
  if (msg.type === "order") {
    resetSession(from);
    await startCartCheckout(from, msg.order || {}, session);
    return;
  }

  // ---- Flow form submitted → auto-create the order ----
  if (msg.type === "flow_done") {
    await handleFlowDone(from, msg);
    return;
  }

  // ---- Boss reply-mode is text-only (button taps pass through; customer media unaffected) ----
  if (adminOK && !actionId && session.step === "admin_reply" && msg.type && msg.type !== "text") {
    await sendText(from, "📝 Reply mode is text-only for now — type your message, or *done* to stop.");
    return;
  }
  // ---- Customer media: receipts, voice notes, stickers... (never falls to menus) ----
  if (["image", "video", "audio", "document", "sticker", "location", "contacts", "reaction"].includes(msg.type)) {
    await handleIncomingMedia(from, msg, messageId);
    return;
  }

  // ---- Cancel / menu escape during any form ----
  if (session.step !== "idle" && (lower === "cancel" || lower === "menu" || (adminOK && /^(admin|boss|console)$/.test(lower)))) {
    resetSession(from);
    if (adminOK) await showAdminMenu(from, session);
    else await showMenu(from, session);
    return;
  }

  // ---- Native-cart checkout steps ----
  if (session.step.startsWith("cart_")) {
    if (!text) {
      await sendText(from, "Please send that as text 🙏 (or *cancel* to stop)");
      return;
    }
    await handleCartStep(from, session, text);
    return;
  }

  // ---- Search query step ----
  if (session.step === "awaiting_search") {
    resetSession(from);
    await showSearchResults(from, text, session);
    return;
  }

  // ---- Bank transaction ID step (payment approval flow) ----
  if (session.step === "awaiting_bankref") {
    const ref = session.form?.ref;
    if (/^paid$/i.test(text)) {
      await askBankRef(from, session, ref); // already on it — re-prompt, don't store "paid" as the ID
      return;
    }
    const bankRef = lower === "skip" ? "" : text;
    const ticket = ref && getTicketByRef(ref);
    resetSession(from);
    if (!ticket) {
      await sendText(from, "Hmm, that order vanished 😅 — type *menu* and try again.");
      return;
    }
    if (bankRef) updateTicket(ref, { bankRef: bankRef.slice(0, 64) });
    await sendText(from, `✅ Received! Your payment for *${ref}* is now with our team — you'll get a confirmation here once approved (usually within minutes ⚡).\n\n${TAGLINE}`);
    if (ADMIN()) await sendApprovalCard(ADMIN(), getTicketByRef(ref));
    return;
  }

  // ---- Admin decline-reason step ----
  if (session.step === "awaiting_decline_reason") {
    if (!ADMIN() || from !== ADMIN()) {
      resetSession(from);
      return;
    }
    await handleDeclineReason(from, session, text);
    return;
  }
  // ---- Long decline-reason: boss must tap Send or Cancel (no accidental novels) ----
  if (session.step === "awaiting_decline_confirm" && !actionId) {
    if (!adminOK) { resetSession(from); return; }
    await sendText(from, "👆 Tap *Send it* or *Cancel* above to decide.");
    return;
  }

  // ---- Boss guided flows: amounts typed after tapping a ticket ----
  if (session.step === "admin_quote_amount") {
    if (!adminOK) { resetSession(from); return; }
    const amount = cleanAmount(text);
    if (!amount || amount < 100) {
      await sendText(from, "Send the quote as digits (e.g. 15000) — no letters. Or *cancel*.");
      return;
    }
    const ref = session.form?.ref;
    resetSession(from);
    await sendQuoteNow(from, ref, amount);
    return;
  }
  if (session.step === "admin_paid_amount") {
    if (!adminOK) { resetSession(from); return; }
    const amount = cleanAmount(text);
    const ref = session.form?.ref;
    const ticket = ref && getTicketByRef(String(ref).toUpperCase());
    if (!ticket) {
      resetSession(from);
      await sendText(from, `❌ No ticket ${ref}.`);
      return;
    }
    if (!amount || amount <= 0) {
      await sendText(from, "Send the confirmed amount as digits (e.g. 15000). Or *cancel*.");
      return;
    }
    resetSession(from);
    await reportPaidResult(from, ticket, amount);
    return;
  }
  // ---- Boss reply mode: every text goes to the paused customer ----
  if (session.step === "admin_reply") {
    if (!adminOK) { resetSession(from); return; }
    if (actionId) {
      // Tapping any button exits reply mode; the tap itself is handled normally below.
      resetSession(from);
      session = getSession(from);
    } else if (/^(done|stop|finish)$/.test(lower)) {
      const phone = session.form?.phone;
      resetSession(from);
      setMenu(session, [`aresume_${phone}`, "adminmenu"]);
      await sendButtons(from, `Stopped replying to ${phone}. Hand them back to the bot?`, [
        { id: `aresume_${phone}`, title: "1. ✅ Resume bot" },
        { id: "adminmenu", title: "2. ⏸ Keep paused" },
      ]);
      return;
    } else {
      const phone = session.form?.phone;
      if (!phone || !text) {
        resetSession(from);
        await showAdminMenu(from, getSession(from));
        return;
      }
      await sendText(phone, `🧑‍💼 *Paragon team:*\n${text}`);
      await sendReaction(from, messageId, "✅");
      return;
    }
  }

  // ---- ORDER flow steps ----
  if (session.step === "order_qty") {
    const qty = parseInt(text, 10);
    if (!qty || qty < 1 || qty > 50) {
      await sendText(from, "Send a valid number (1–50). Or type *cancel* to stop.");
      return;
    }
    session.form.qty = qty;
    session.form.total = qty * session.form.price;
    await maybeAskIdentity(from, session, `Step 2/4: Total = *${formatPrice(session.form.total)}* ✅\n\n`);
    return;
  }
  if (session.step === "order_confirm_identity") {
    if (actionId === "order_use_saved" || /^(yes|yeah|yep|correct|same|that's me)/.test(lower)) {
      session.form.name = session.form.savedName || session.form.name;
      session.form.phone = session.form.savedPhone || session.form.phone;
      session.step = "order_details";
      await askOrderDetails(from, session, "Last step");
      return;
    }
    if (actionId === "order_new_identity" || /^(no|different|change|new)/.test(lower)) {
      delete session.form.savedName;
      delete session.form.savedPhone;
      session.step = "order_name";
      await sendText(from, "No problem! What is your *full name*?");
      return;
    }
    await sendButtons(from, `Ordering as *${session.form.savedName}* (${session.form.savedPhone})? 👇\n(Tap a button)`, [
      { id: "order_use_saved", title: "1. Yes, that's me" },
      { id: "order_new_identity", title: "2. Use different" },
    ]);
    return;
  }
  if (session.step === "order_name") {
    session.form.name = text;
    session.step = "order_phone";
    await sendText(from, session.form.isQuote ? "Step 2/3: What is your *phone number*?" : "Step 3/4: What is your *phone number*?");
    return;
  }
  if (session.step === "order_phone") {
    session.form.phone = text;
    session.step = "order_details";
    await askOrderDetails(from, session, session.form.isQuote ? "Step 3/3" : "Step 4/4");
    return;
  }
  if (session.step === "order_details") {
    session.form.details = text;
    const ref = `SHOP-${Date.now().toString(36).toUpperCase()}${from.slice(-4)}`;

    // ---- QUOTE MODE (price range services) ----
    if (session.form.isQuote) {
      const t = saveTicket({ ref, customer: from, status: "awaiting_quote", total: null, paidSoFar: 0, dueNow: null, ...session.form });
      resetSession(from);
      await recordOrderCredit(from);
      await sendReaction(from, messageId, "🎉");
      await sendText(
        from,
        `📩 *Request ${ref} received!*\n\n🧾 ${t.product}\n💰 Usual range: *${formatPrice(t.priceMin)} – ${formatPrice(t.priceMax)}*\n👤 ${t.name}\n📝 ${t.details}\n\nWe'll send your exact price + payment link here shortly.\n⚠️ Reminder: payment first — work begins after confirmation, by appointment 📅\n\n${TAGLINE}`
      );
      if (ADMIN()) {
        await sendText(ADMIN(), `🆕 *QUOTE REQUEST ${ref}*\nFrom: ${from}\nService: ${t.product}\nName: ${t.name}\nPhone: ${t.phone}\nBrief: ${t.details}\n\nSend quote: /quote ${ref} 15000 (or *admin* → 💰 Quote)`);
      }
      setMenu(session, ["menu", "human"]);
      await sendButtons(from, "We'll be in touch 👇", [
        { id: "menu", title: "1. Main Menu" },
        { id: "human", title: "2. Talk to Human" },
      ]);
      return;
    }

    // ---- FIXED PRICE MODE (rewards auto-apply, 50/50 installments over threshold) ----
    let total = session.form.total;
    const reward = peekReward(from, session.form.productId, total);
    let rewardLine = "";
    if (reward) {
      total = Math.max(0, total - reward.discount);
      session.form.total = total;
      rewardLine = `\n🎁 ${reward.label} applied: *-${formatPrice(reward.discount)}*`;
      consumeReward(from, reward.type);
    }
    // ---- FREE (reward covered everything): auto-confirm, no payment ----
    if (total <= 0) {
      const t = saveTicket({ ref, customer: from, status: "paid", total: 0, paidSoFar: 0, dueNow: 0, rewardApplied: reward.type, ...session.form });
      resetSession(from);
      await recordOrderCredit(from);
      await sendReaction(from, messageId, "🎉");
      await sendText(from, `🎉 *Order ${ref} — FREE with your reward!*\n\n🧾 ${t.product}${t.qty > 1 ? ` x${t.qty}` : ""}\n💰 Total: *₦0* — ${reward.label} covered it! 🎁\n👤 ${t.name}\n\nNo payment needed — work is now scheduled 🛠️\n\n${TAGLINE}`);
      if (ADMIN()) {
        await sendText(ADMIN(), `🎁 *FREE REWARD ORDER ${ref}*\nFrom: ${from}\nService: ${t.product} (${t.productId})${t.qty > 1 ? ` x${t.qty}` : ""}\nReward: ${reward.type} (auto-applied — customer pays ₦0)\nName: ${t.name}\nPhone: ${t.phone}\nDetails: ${t.details}\n→ Fulfill like a paid order.`);
      }
      setMenu(session, ["track", "menu"]);
      await sendButtons(from, "Track it anytime 👇", [
        { id: "track", title: "1. Track Order" },
        { id: "menu", title: "2. Main Menu" },
      ]);
      return;
    }
    const due = depositDue(total);
    const split = due < total;
    const t = saveTicket({ ref, customer: from, status: "new_order", paidSoFar: 0, dueNow: due, rewardApplied: reward ? reward.type : null, ...session.form });
    resetSession(from);
    await recordOrderCredit(from);
    await sendReaction(from, messageId, "🎉");
    if (process.env.STICKER_CELEBRATE) {
      try { await sendSticker(from, process.env.STICKER_CELEBRATE); } catch { /* optional */ }
    }
    const summary =
      `🎉 *Order ${ref} received!*\n\n🧾 ${t.product}${t.qty > 1 ? ` x${t.qty}` : ""}` +
      `\n💰 Total: *${formatPrice(total)}*` +
      rewardLine +
      (split ? `\n\n💳 *Installments:* pay *50% deposit (${formatPrice(due)})* to start — balance *${formatPrice(total - due)}* before delivery.` : "") +
      `\n👤 ${t.name}\n📝 ${t.details}` +
      `\n\n⚠️ Work begins after payment confirmation.`;

    if (paymentsEnabled()) {
      try {
        const link = await createPaymentLink({
          email: `${from}@whatsapp.shop`,
          amountKobo: Math.round(due * 100),
          reference: ref,
          metadata: { phone: from, name: t.name, product: t.product, qty: String(t.qty) },
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
      await sendText(ADMIN(), `🆕 *NEW ORDER ${ref}*\nFrom: ${from}\nService: ${t.product} (${t.productId})${t.qty > 1 ? ` x${t.qty}` : ""}\nTotal: ${formatPrice(total)}${reward ? ` (🎁 ${reward.type} -${formatPrice(reward.discount)})` : ""}${split ? ` (deposit ${formatPrice(due)} now)` : ""}\nName: ${t.name}\nPhone: ${t.phone}\nDetails: ${t.details}\nPayment: ${paymentsEnabled() ? "Paystack link sent" : "manual transfer"}`);
    }
    setMenu(session, ["track", "menu"]);
    await sendButtons(from, "Track it anytime 👇", [
      { id: "track", title: "1. Track Order" },
      { id: "menu", title: "2. Main Menu" },
    ]);
    return;
  }

  // ---- COMPLAINT flow steps ----
  if (session.step === "awaiting_name") {
    session.form.name = text;
    session.step = "awaiting_order";
    await sendButtons(from, "Step 2/4: What is your *Order ref*? (e.g. SHOP-XXXX)", [
      { id: "skip", title: "Skip" },
      { id: "cancel", title: "Cancel" },
    ]);
    return;
  }
  if (session.step === "awaiting_order") {
    session.form.orderId = lower === "skip" ? "N/A" : text.toUpperCase();
    session.step = "awaiting_issue";
    await sendText(from, session.form?.kind === "feedback" ? "Step 3/4: Share your *feedback* 💡 (what did you love? what should we improve?)" : "Step 3/4: Briefly describe the *issue* (wrong service, delay, numbers dropped, refund…)");
    return;
  }
  if (session.step === "awaiting_issue") {
    session.form.issue = text;
    session.step = "awaiting_phone";
    await sendText(from, "Step 4/4: What number should we call you back on?");
    return;
  }
  if (session.step === "awaiting_phone") {
    session.form.callback = text;
    const isFdb = session.form.kind === "feedback";
    const cref = `${isFdb ? "FDB" : "CMP"}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const ticket = saveTicket({ ref: cref, customer: from, status: "open", ...session.form });
    resetSession(from);
    await sendText(
      from,
      `✅ *${isFdb ? "Feedback" : "Complaint"} ticket ${cref} received!*\n\nName: ${ticket.name}\nOrder: ${ticket.orderId}\n${isFdb ? "Feedback" : "Issue"}: ${ticket.issue}\nCallback: ${ticket.callback}\n\nOur team has it — even if we're away right now, we'll reply here when we're back (within 24h). Your ref is *${cref}* — quote it anytime.\n\n${TAGLINE}`
    );
    if (ADMIN()) {
      await sendText(ADMIN(), `🆕 *New ${isFdb ? "feedback" : "complaint"} ticket ${cref}*\nFrom: ${from}\nName: ${ticket.name}\nOrder: ${ticket.orderId}\n${isFdb ? "Feedback" : "Issue"}: ${ticket.issue}\nCallback: ${ticket.callback}`);
    }
    setMenu(session, ["menu"]);
    await sendButtons(from, "Anything else? 👇", [{ id: "menu", title: "1. Main Menu" }]);
    return;
  }

  // ---- Order-ref lookup step (buttons work here too) ----
  if (session.step === "awaiting_order_lookup") {
    if (actionId === "menu") {
      resetSession(from);
      await showMenu(from, session);
      return;
    }
    if (actionId === "human") {
      resetSession(from);
      paused.add(from);
      await sendText(from, `Connecting you to a human 🧑‍💼\nPlease describe what you need — someone will reply shortly.\n\n${TAGLINE}`);
      if (ADMIN()) await notifyHandover(ADMIN(), from, `🙋 *Handover request* from ${from}.`, "Chat paused — tap 💬 Reply to answer them here.");
      return;
    }
    resetSession(from);
    await trackLookup(from, text, session);
    return;
  }

  // ---- Prefix actions (catalog navigation + pagination + proof galleries) ----
  if (actionId === "proof" || actionId.startsWith("proof_")) {
    await handleProofAction(from, actionId, session);
    return;
  }
  if (actionId === "menu") {
    await showMenu(from, session);
    return;
  }
  if (actionId === "refer") {
    await showRefer(from, session);
    return;
  }
  if (actionId === "rewards") {
    await showRewards(from, session);
    return;
  }
  if (actionId === "track_manual") {
    session.step = "awaiting_order_lookup";
    await sendButtons(from, "Sure! Send your *Order ref* (e.g. SHOP-XXXX — from your order message).", [
      { id: "cancel", title: "Cancel" },
    ]);
    return;
  }
  if (actionId.startsWith("track_")) {
    await trackLookup(from, actionId.replace("track_", ""), session);
    return;
  }
  if (actionId.startsWith("paidfor_")) {
    await confirmPaidFor(from, actionId.replace("paidfor_", ""), session);
    return;
  }
  if (actionId.startsWith("approve_")) {
    await handleApprove(from, actionId.replace("approve_", ""), messageId);
    return;
  }
  if (actionId.startsWith("decline_")) {
    await handleDeclineStart(from, actionId.replace("decline_", ""), session);
    return;
  }
  if (actionId.startsWith("adminview_")) {
    if (ADMIN() && from === ADMIN()) {
      await showTicketAdmin(from, actionId.replace("adminview_", ""), session);
    } else {
      await sendText(from, "⛔ Admin only.");
    }
    return;
  }
  if (actionId === "pending") {
    if (ADMIN() && from === ADMIN()) {
      await showPendingDashboard(from, session);
    } else {
      await showMyOrders(from, session);
    }
    return;
  }
  // ---- Boss console actions (admin-only; strangers get stopped, never data) ----
  if (actionId === "adminmenu") {
    if (adminOK) await showAdminMenu(from, session);
    else await showMenu(from, session);
    return;
  }
  if (actionId === "custmenu") {
    await showMenu(from, session);
    return;
  }
  if (actionId === "adminmore" || actionId === "ahelp") {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    if (actionId === "adminmore") await showAdminMore(from, session);
    else await adminHelp(from, session);
    return;
  }
  if (actionId === "aquote_pick" || actionId === "apaid_pick" || actionId === "abal_pick" || actionId === "aremind_pick" || actionId === "adeliver_pick") {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await pickTicketFor(from, { aquote_pick: "quote", apaid_pick: "paid", abal_pick: "balance", aremind_pick: "remind", adeliver_pick: "deliver" }[actionId], session);
    return;
  }
  if (actionId.startsWith("aquote_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await askQuoteAmount(from, actionId.replace("aquote_", ""), session);
    return;
  }
  if (actionId.startsWith("apaidgo_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await handleApprove(from, actionId.replace("apaidgo_", ""), messageId);
    return;
  }
  if (actionId.startsWith("apaidamt_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await askPaidAmount(from, actionId.replace("apaidamt_", ""), session);
    return;
  }
  if (actionId.startsWith("apaid_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await showPaidConfirm(from, actionId.replace("apaid_", ""), session);
    return;
  }
  if (actionId.startsWith("adelivergo_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await deliverTicket(from, actionId.replace("adelivergo_", ""));
    return;
  }
  if (actionId.startsWith("adeliver_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await showDeliverConfirm(from, actionId.replace("adeliver_", ""), session);
    return;
  }
  if (actionId.startsWith("abal_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await sendBalanceNow(from, actionId.replace("abal_", ""));
    return;
  }
  if (actionId.startsWith("aremind_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await sendRemindNow(from, actionId.replace("aremind_", ""));
    return;
  }
  if (actionId === "aresume_list") {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await showPausedChats(from, session);
    return;
  }
  if (actionId.startsWith("aresume_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await resumeChat(from, actionId.replace("aresume_", ""));
    return;
  }
  if (actionId.startsWith("areply_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await enterReplyMode(from, actionId.replace("areply_", ""), session);
    return;
  }
  if (actionId.startsWith("apaused_")) {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    await showPausedChat(from, actionId.replace("apaused_", ""), session);
    return;
  }
  if (actionId === "areason_send" || actionId === "areason_cancel") {
    if (!adminOK) { await sendText(from, "⛔ Admin only."); return; }
    const f = session.form;
    const ticket = f?.ref && getTicketByRef(String(f.ref).toUpperCase());
    resetSession(from);
    if (!ticket) {
      await sendText(from, "Ticket vanished — nothing sent.");
      return;
    }
    if (actionId === "areason_send") {
      await sendDeclineNow(from, ticket, f.reason || "");
    } else {
      await sendText(from, `Decline cancelled — ${ticket.ref} stays open.`);
      await showAdminMenu(from, getSession(from));
    }
    return;
  }
  if (actionId.startsWith("cats_more_")) {
    await showCategories(from, parseInt(actionId.replace("cats_more_", ""), 10) || 0, session);
    return;
  }
  {
    const m = actionId.match(/^prods_(.+)_more_(\d+)$/);
    if (m) {
      await showProducts(from, m[1], parseInt(m[2], 10) || 0, session);
      return;
    }
  }
  if (actionId.startsWith("cat_")) {
    await showProducts(from, actionId.replace("cat_", ""), 0, session);
    return;
  }
  if (actionId.startsWith("prod_")) {
    await showProduct(from, actionId.replace("prod_", ""), session);
    return;
  }
  if (actionId.startsWith("order_")) {
    await startOrder(from, session, actionId.replace("order_", ""));
    return;
  }

  // ---- Button / list actions ----
  switch (actionId) {
    case "shop":
      await showCategories(from, 0, session);
      return;
    case "native_catalog":
      await sendNativeCatalog(from);
      return;
    case "search":
      session.step = "awaiting_search";
      await sendButtons(from, "🔎 What are you looking for?\n(e.g. *logo*, *followers*, *website*)", [
        { id: "cancel", title: "Cancel" },
      ]);
      return;
    case "track":
      await showMyOrders(from, session);
      return;
    case "faqs":
      await showFaqList(from, 0, session);
      return;
    case "faqs_more_1":
      await showFaqList(from, 1, session);
      return;
    case "faqs_back":
      await showFaqList(from, 0, session);
      return;
    case "appoint":
      await sendFaq(from, "appoint", session);
      return;
    case "human":
      if (adminOK) { await showAdminMenu(from, session); return; }
      paused.add(from);
      await sendText(from, `Connecting you to a human 🧑‍💼\nPlease describe what you need — someone will reply shortly. (The bot is paused for this chat.)\n\n${TAGLINE}`);
      if (ADMIN()) await notifyHandover(ADMIN(), from, `🙋 *Handover request* from ${from}.`, "Customer asked for a human — tap 💬 Reply to answer them here.");
      return;
    case "complain":
      await startComplaint(from, session);
      return;
    case "feedback":
      await startComplaint(from, session, "feedback");
      return;
    case "faq_delivery":
      await sendFaq(from, "delivery", session);
      return;
    case "faq_returns":
      await sendFaq(from, "returns", session);
      return;
    case "faq_payment":
      await sendFaq(from, "payment", session);
      return;
    case "faq_product":
      await sendFaq(from, "product", session);
      return;
    case "faq_safety":
      await sendFaq(from, "safety", session);
      return;
    case "faq_real":
      await sendFaq(from, "real", session);
      return;
    case "faq_custom":
      await sendFaq(from, "custom", session);
      return;
    case "faq_discounts":
      await sendFaq(from, "discounts", session);
      return;
  }

  // ---- Keyword routing (plain text) ----
  if (!text) {
    if (adminOK) await showAdminMenu(from, session);
    else await showMenu(from, session);
    return;
  }
  // Referral code via wa.me prefill or typed — checked BEFORE greeting,
  // because "Hi! I was referred by PG-XXXX" starts with "hi".
  {
    const code = !actionId && session.step === "idle" ? parseCode(text) : null;
    if (code) {
      const res = await recordJoin(from, code);
      if (res.ok) {
        await sendText(from, `Welcome to *${SHOP()}*! 🎉\nYou joined with a referral — great taste already 😄\nYour friend earns once you place your first order!`);
        await showMenu(from, session);
        return;
      }
      if (res.reason === "self") {
        await sendText(from, "That's YOUR OWN code 😄 — share it with friends instead! Type *refer* to get your share link.");
        return;
      }
      if (res.reason === "already") {
        await sendText(from, "You're already linked to a referral 👍 — type *shop* to order!");
        return;
      }
      // unknown code → fall through to normal routing (never dead-end)
    }
  }
  if (/^(hi|hello|hey|start|menu|cancel)/i.test(lower)) {
    if (adminOK) { await showAdminMenu(from, session); return; }
    return showMenu(from, session);
  }
  // Boss console trigger (admin only; anyone else falls through silently)
  if (!actionId && session.step === "idle" && /^(admin|boss|console)$/.test(lower)) {
    if (adminOK) { await showAdminMenu(from, session); return; }
  }
  {
    // "find X" / "search X" → instant search
    const m = lower.match(/^(find|search)\s+(.+)/);
    if (m) return showSearchResults(from, m[2], session);
  }
  if (/^search$/.test(lower)) {
    session.step = "awaiting_search";
    await sendButtons(from, "🔎 What are you looking for? (e.g. *logo*, *followers*, *website*)", [
      { id: "cancel", title: "Cancel" },
    ]);
    return;
  }
  // Customer says they've paid (manual mode) → smart-match to their order
  if (/paid|i have sent|i've sent|sent the money/.test(lower) && session.step === "idle") {
    await handlePaidClaim(from, session, messageId);
    return;
  }
  // Order ref pasted directly (SHOP-XXX or legacy ORD-XXX)
  {
    const m = text.match(/(SHOP-[A-Z0-9]+|ORD-\d+)/i);
    if (m) {
      await trackLookup(from, m[1], session);
      return;
    }
  }
  // Pending dashboard (admin) / my orders (everyone else)
  if (/pending|dashboard|approvals/.test(lower)) {
    if (ADMIN() && from === ADMIN()) {
      await showPendingDashboard(from, session);
    } else {
      await showMyOrders(from, session);
    }
    return;
  }
  if (/track|where.*(order|job)|order.*status/.test(lower)) {
    await showMyOrders(from, session);
    return;
  }
  // Questions about safety / realness (asked as questions, not complaints)
  {
    const looksQuestion = /\?|^(are|is|do|does|can|will|how|what|why)\b/.test(lower);
    if (looksQuestion && /real|fake|genuine|legit|proof/.test(lower)) {
      await sendFaq(from, "real", session);
      return;
    }
    if (looksQuestion && /safe|ban|suspend|password|hack/.test(lower)) {
      await sendFaq(from, "safety", session);
      return;
    }
  }
  if (/feedback|suggestion/.test(lower)) {
    if (adminOK) { await showAdminMenu(from, session); return; }
    return startComplaint(from, session, "feedback");
  }
  if (/complain|refund|wrong|fake/.test(lower) || /return.*(money|order|refund|payment)|want.*\breturn\b/.test(lower) || /(follower|like|view|number|count).{0,20}drop|drop.{0,20}(follower|like|view|number|count)/.test(lower) || /not.*(working|delivered|started)/.test(lower)) {
    if (adminOK) { await showAdminMenu(from, session); return; }
    return startComplaint(from, session);
  }
  if (/human|agent|talk.*person|call me/.test(lower)) {
    if (adminOK) { await showAdminMenu(from, session); return; }
    paused.add(from);
    await sendText(from, `Connecting you to a human 🧑‍💼\nPlease describe what you need — someone will reply shortly.\n\n${TAGLINE}`);
    if (ADMIN()) await notifyHandover(ADMIN(), from, `🙋 *Handover request* from ${from}:`, `"${text}"\nChat paused — tap 💬 Reply to answer them here.`);
    return;
  }
  if (/proof(?!\s+of\s+payment)|sample|example|portfolio|past work|previous work|see.*work|show.*work/.test(lower)) {
    await handleProofAction(from, "proof", session);
    return;
  }
  if (/custom|special.*(package|order)|specific numbers/.test(lower)) {
    await sendFaq(from, "custom", session);
    return;
  }
  if (/my rewards?|referral code|my code/.test(lower)) {
    await showRewards(from, session);
    return;
  }
  if (/refer(ral)?s?\b/.test(lower) && !/prefer/.test(lower)) {
    await showRefer(from, session);
    return;
  }
  if (/discount|promo|reward|free (starter|growth)/.test(lower)) {
    await sendFaq(from, "discounts", session);
    return;
  }
  if (/appointment|book|schedul/.test(lower)) {
    await sendFaq(from, "appoint", session);
    return;
  }
  if (/^(form|order form|fill form)$/.test(lower) || /open.*form|send.*form|fill.*form/.test(lower)) {
    if (process.env.FLOW_ID) {
      await sendFlowMessage(from, {
        flowId: process.env.FLOW_ID,
        flowToken: `flow_${from}_${Date.now()}`,
        cta: "Start order form",
        body: `📝 *${SHOP()} quick order form*\nFill it in one screen — service, details, done. We'll confirm + send payment steps instantly.`,
        footer: TAGLINE,
      });
    } else {
      await sendText(from, `Our one-screen form is launching soon! Meanwhile type *shop* — ordering in chat takes under a minute 😊\n\n${TAGLINE}`);
    }
    return;
  }
  if (/^(catalog|cart|store)$/.test(lower) || /open catalog|view catalog|native catalog/.test(lower)) {
    await sendNativeCatalog(from);
    return;
  }
  if (/shop|buy|catalog|design|website|logo|flyer|brand|boost|follower|subscriber|traffic|price|how much|cost/.test(lower)) return showCategories(from, 0, session);
  if (/deliver|how long|timeline|duration|dispatch/.test(lower)) {
    await sendFaq(from, "delivery", session);
    return;
  }
  if (/pay|transfer|receipt|opay|ussd|deposit|installment|account (details|number|to pay)/.test(lower)) {
    await sendFaq(from, "payment", session);
    return;
  }

  // ---- Fallback ----
  if (adminOK) { await showAdminMenu(from, session); return; }
  setMenu(session, ["shop", "track", "faqs"]);
  await sendButtons(
    from,
    "I didn't quite get that 😅\nPick an option below and I'll help faster:",
    [
      { id: "shop", title: "1. 🛍️ Shop" },
      { id: "track", title: "2. Track Order" },
      { id: "faqs", title: "3. Help / FAQs" },
    ],
    { footer: "Tap or reply 1, 2, 3 • 'find logo' to search" }
  );
}
