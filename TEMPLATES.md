# 📩 Message Templates (proactive + promo messages)

Templates are Meta-pre-approved messages — the ONLY way to message a customer who
hasn't chatted in 24h, or to send promos. Everything else in this bot is free-form
(free inside the 24h service window). Templates cost per message (Utility cheap,
Marketing higher) — so these stay OFF until you choose to spend.

**Code status:** sending is fully implemented (`sendTemplate`, `sendCarouselTemplate`,
`/remind` admin command). **Your part:** create each template below in
WhatsApp Manager → Message templates, wait for approval (~1 min – 24h), then put
its exact name in `.env`.

## Template 1: payment_reminder (Utility) — wired to `/remind <ref>`

| Field | Value |
|---|---|
| Name | `payment_reminder` |
| Category | Utility |
| Language | en |
| Body | `Hi {{1}} 👋, quick reminder: order {{2}} ({{3}}) is awaiting payment. Reply here once you've transferred — or tap below.` |
| Buttons | Quick reply: `I have paid` |

Variables the bot fills: `{{1}}` = customer name, `{{2}}` = order ref, `{{3}}` = amount due.
Admin use: `/remind SHOP-XXXX` → customer gets the template → taps **I have paid**
→ arrives as a button tap the bot already understands (paid-ack flow fires).

## Template 2: order_update (Utility) — for status pushes

| Field | Value |
|---|---|
| Name | `order_update` |
| Category | Utility |
| Language | en |
| Body | `Hi {{1}} 👋, update on your Paragon Hub order {{2}}: {{3}} — Paragon Hub. Fast. Creative. Affordable.` |

`{{3}}` examples: "your logo draft is ready, check your DM", "balance received, delivery today".
Send from code: `sendTemplate(phone, "order_update", "en", [{ type: "body", parameters: [...] }])`.

## Template 3: delivery_done (Utility) — "it's ready" ping

| Field | Value |
|---|---|
| Name | `delivery_done` |
| Category | Utility |
| Language | en |
| Body | `Hi {{1}} 🎉, your order {{2}} is DONE! {{3}} Thanks for choosing Paragon Hub 💪🏽` |

## Template 4: bundle_promo (Marketing, CAROUSEL) — the flashy one

Create as a **Carousel** template with 3 cards. Each card: header image + short body
+ 1 quick-reply button.

| Card | Header | Body | Button (payload) |
|---|---|---|---|
| 1 | Starter image `{{1}}` | `Starter Boost — {{2}}! Perfect first push 🚀` | `Claim Starter` → payload `shop` |
| 2 | Growth image | `Growth Boost — {{3}}! Serious numbers 📈` | `Claim Growth` → payload `shop` |
| 3 | Website image | `Business website from {{4}} 🌐 Free quote today` | `Get Quote` → payload `shop` |

Top-level body: `Hi {{1}} 🔥 Paragon Hub deals this week — swipe 👉`

**Payload trick (zero extra code):** quick-reply payloads arrive as button taps.
Payload `shop` opens the catalogue; `proof` opens galleries; `human` hands over;
`paid` fires the paid-ack. So set payloads to words the bot already routes.

Send from code:
```js
import { sendCarouselTemplate } from "./whatsapp.js";
await sendCarouselTemplate("2348012345678", "bundle_promo", "en", {
  bodyParams: ["Ada"],
  cards: [
    { image: "https://.../starter.jpg", bodyTexts: ["₦5,000"], buttons: [{ kind: "quick_reply", payload: "shop" }] },
    { image: "https://.../growth.jpg", bodyTexts: ["₦15,000"], buttons: [{ kind: "quick_reply", payload: "shop" }] },
    { image: "https://.../site.jpg", bodyTexts: ["₦60,000"], buttons: [{ kind: "quick_reply", payload: "shop" }] },
  ],
});
```

## Rules (Meta enforces these)
- Marketing templates need customer **opt-in** first (they agreed to promos). No opt-in + spam reports = ban.
- Never put a phone number, email or raw URL in the body — use button/parameter fields.
- Names are lowercase + underscores; the `.env` name must match EXACTLY.
- Test with the sandbox number first; each send to a real customer costs money.
