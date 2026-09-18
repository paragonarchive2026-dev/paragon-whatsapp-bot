import "dotenv/config";
import express from "express";
import { handleIncoming } from "./bot.js";
import { verifyPayment, verifyWebhookSignature, paymentsEnabled } from "./payments.js";
import { getTicketByRef, updateTicket } from "./store.js";
import { recordOrderCredit } from "./rewards.js";
import { sendText } from "./whatsapp.js";
import { restoreFromCloud } from "./backup.js";

const app = express();

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "change-me";
const ADMIN = process.env.ADMIN_PHONE || "";
const PORT = process.env.PORT || 3000;

// ---- Paystack webhook (registered BEFORE express.json: needs RAW body for signature check) ----
app.post("/webhooks/paystack", express.raw({ type: "application/json" }), async (req, res) => {
  res.sendStatus(200); // ACK first, process after — Paystack retries non-200s
  try {
    if (!paymentsEnabled()) return;
    const sig = req.headers["x-paystack-signature"];
    if (!verifyWebhookSignature(req.body, sig)) {
      console.error("❌ Invalid Paystack webhook signature");
      return;
    }
    const event = JSON.parse(req.body.toString());
    if (event.event !== "charge.success") return;

    const { reference, amount, channel } = event.data;

    // 1) Match: order ref OR issued balance ref (installment second leg)
    const baseRef = reference.endsWith("-BAL") ? reference.slice(0, -4) : reference;
    const ticket = getTicketByRef(baseRef);
    if (!ticket) {
      console.error("No ticket for reference", reference);
      return;
    }
    if (reference !== ticket.ref && reference !== ticket.balanceRef) {
      console.error("Unknown payment reference (not issued by us):", reference);
      return;
    }
    if (ticket.status === "paid") return; // idempotency: already processed

    // 2) Server-side double-check with Paystack API
    const check = await verifyPayment(reference);
    if (!(check.status && check.data?.status === "success")) {
      console.error("Paystack verify failed for", reference);
      return;
    }

    // 3) Amount check (Paystack amounts are in KOBO) vs current due chunk
    const dueNow = ticket.dueNow ?? ticket.total ?? 0;
    const expectedKobo = Math.round(Number(dueNow) * 100);
    if (check.data.amount !== expectedKobo) {
      console.error(`Amount mismatch on ${reference}: expected ${expectedKobo}, got ${check.data.amount}`);
      if (ADMIN) await sendText(ADMIN(), `⚠️ *Amount mismatch* on ${reference}: expected ₦${Number(dueNow).toLocaleString()}, paid ₦${(check.data.amount / 100).toLocaleString()}. Check before fulfilling.`);
      return;
    }

    // 4) Apply payment — supports 50/50 installments
    const paidNow = check.data.amount / 100;
    const paidSoFar = (ticket.paidSoFar || 0) + paidNow;
    const total = ticket.total || 0;
    const fullyPaid = total > 0 && paidSoFar >= total;
    updateTicket(ticket.ref, {
      status: fullyPaid ? "paid" : "deposit_paid",
      paidSoFar,
      dueNow: Math.max(0, total - paidSoFar),
      paidAt: new Date().toISOString(),
      channel,
    });
    try { await recordOrderCredit(ticket.customer); } catch { /* credit is best-effort */ }
    const money = (n) => `₦${Number(n).toLocaleString()}`;
    const TAG = "Fast. Creative. Affordable. That's The Paragon Way! 💪🏽";
    if (fullyPaid) {
      await sendText(
        ticket.customer,
        `✅ *Payment confirmed!* Thank you so much! 🙏🏽\n\n🧾 Order *${ticket.ref}*\n💰 ${money(paidSoFar)} received in full via ${channel || "Paystack"}\n\nYour order is now being processed 🛠️\nWe'll notify you here once it's done!\n\n${TAG}`
      );
      if (ADMIN) {
        await sendText(ADMIN(), `💰 *PAID IN FULL ${ticket.ref}*\nService: ${ticket.product}${ticket.qty > 1 ? ` x${ticket.qty}` : ""}\nTotal: ${money(total)}\nCustomer: ${ticket.name} (${ticket.customer})\nDetails: ${ticket.details || ""}\nChannel: ${channel}`);
      }
      console.log("✅ Payment matched + confirmed in full:", reference);
    } else {
      const bal = Math.max(0, total - paidSoFar);
      await sendText(
        ticket.customer,
        `✅ *Deposit confirmed!* Thank you! 🙏🏽\n\n🧾 Order *${ticket.ref}*\n💰 ${money(paidNow)} received (${money(paidSoFar)} of ${money(total)})\n\nWork is scheduled 🛠️\nBalance *${money(bal)}* due before delivery.\n\n${TAG}`
      );
      if (ADMIN()) {
        await sendText(ADMIN(), `💰 *DEPOSIT ${ticket.ref}* — ${money(paidNow)} (${money(paidSoFar)} of ${money(total)})\nCustomer: ${ticket.name} (${ticket.customer})\nStart work; collect balance ${money(bal)} before delivery: /balance ${ticket.ref}`);
      }
      console.log("✅ Deposit matched + confirmed:", reference);
    }
  } catch (err) {
    console.error("Paystack webhook error:", err.response?.data || err.message);
  }
});

app.use("/img", express.static("public/img")); // self-hosted product/proof images

app.use(express.json());

app.get("/", (_req, res) => res.send("WhatsApp bot is running. Webhooks: /webhook (WhatsApp), /webhooks/paystack ✅"));

// ---- WhatsApp webhook verification ----
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified ✅");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---- WhatsApp incoming messages ----
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // ACK fast so Meta doesn't retry; process after
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message) return; // status updates (sent/delivered/read) — ignore for v1

    // Dedupe: Meta retries webhooks when ACKs are slow (common on free-tier
    // cold starts) — never process the same message twice.
    globalThis.__seenMsgs ??= new Set();
    if (globalThis.__seenMsgs.has(message.id)) return;
    globalThis.__seenMsgs.add(message.id);
    if (globalThis.__seenMsgs.size > 2000) globalThis.__seenMsgs.delete(globalThis.__seenMsgs.values().next().value);

    const from = message.from;
    const messageId = message.id;
    const msg = normalize(message);
    // Ads attribution: Click-to-WhatsApp sends `referral` once on first touch.
    // Stored silently for future use — never blocks chat.
    if (message.referral) {
      msg.referral = {
        source_type: message.referral.source_type,
        source_id: message.referral.source_id,
        source_url: message.referral.source_url,
        headline: message.referral.headline,
        body: message.referral.body,
      };
    }
    console.log("Incoming from", from, "→", JSON.stringify(msg));

    await handleIncoming(from, msg, messageId);
  } catch (err) {
    console.error("Webhook error:", err.response?.data || err.message);
  }
});

function normalize(message) {
  if (message.type === "text") return { type: "text", text: message.text?.body || "" };
  if (message.type === "interactive") {
    const it = message.interactive;
    if (it.type === "button_reply") return { type: "button", buttonId: it.button_reply?.id, text: it.button_reply?.title };
    if (it.type === "list_reply") return { type: "list", listId: it.list_reply?.id, text: it.list_reply?.title };
    // Flow form submitted → structured answers (response_json string)
    if (it.type === "nfm_reply") {
      return {
        type: "flow_done",
        flowName: it.nfm_reply?.name,
        flowText: it.nfm_reply?.body,
        responseJson: it.nfm_reply?.response_json,
      };
    }
  }
  if (message.type === "button") return { type: "button", buttonId: message.button?.payload, text: message.button?.text };
  // Native catalog cart sent by customer (structured order, not text)
  if (message.type === "order") return { type: "order", order: message.order || {}, text: message.order?.text || "" };
  // Customer media: receipts, briefs, voice notes (relayed to admin in growth.js)
  if (message.type === "image") return { type: "image", mediaId: message.image?.id, mimeType: message.image?.mime_type, caption: message.image?.caption || "" };
  if (message.type === "video") return { type: "video", mediaId: message.video?.id, mimeType: message.video?.mime_type, caption: message.video?.caption || "" };
  if (message.type === "audio") return { type: "audio", mediaId: message.audio?.id, mimeType: message.audio?.mime_type };
  if (message.type === "document") return { type: "document", mediaId: message.document?.id, mimeType: message.document?.mime_type, filename: message.document?.filename || "", caption: message.document?.caption || "" };
  if (message.type === "sticker") return { type: "sticker", mediaId: message.sticker?.id, mimeType: message.sticker?.mime_type, animated: !!message.sticker?.animated };
  if (message.type === "location") return { type: "location", latitude: message.location?.latitude, longitude: message.location?.longitude, name: message.location?.name || "", address: message.location?.address || "" };
  if (message.type === "contacts") return { type: "contacts", count: (message.contacts || []).length };
  if (message.type === "reaction") return { type: "reaction", emoji: message.reaction?.emoji || "", reactedTo: message.reaction?.message_id || "" };
  return { type: message.type, text: message.text?.body || "" };
}

// Restore orders/referrals from Supabase if the disk was wiped (Render free
// restarts), then start serving. Local-first: never overwrites existing files.
await restoreFromCloud().catch((e) => console.error("cloud restore failed:", e.message));

app.listen(PORT, () => console.log(`Listening on :${PORT}`));
