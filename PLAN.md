# WhatsApp E-commerce Support Bot — Full Plan (₦0 Edition)
**Date:** 16 Sep 2026 | **Business:** Digital services — web/graphic design + social-media boost (57 services) | **Build path:** Official WhatsApp Cloud API (Meta) | **Budget: ₦0 / free-first**

> This plan is rewritten for minimum cost. Launch is **₦0** except possibly a new
> SIM (~₦500–₦1,000). You only ever pay small fees when you actually make sales.

## 1. Recap of what you want
- Your business WhatsApp becomes a **bot** with **buttons, menus, catalogue, forms, payments**.
- Customers: browse/search 100+ products, order in chat, pay (link or transfer), track orders, file complaints, reach a human.
- You: get alerts on your phone, confirm orders, hand bot/human over — website dashboard comes later (also free tier when we build it).

## 2. What the official API can do (2026)
Since Oct 2025, **Cloud API is the only official option** (on-premise was deprecated) [3](https://www.messagecentral.com/blog/whatsapp-business-api-complete-guide). It supports up to ~500 msgs/sec, no device limit, unlimited agents.

| Capability | Details | Use in your shop |
|---|---|---|
| **Reply buttons** | Up to 3 quick replies per message [1](https://hyperleap.ai/whatsapp-business-api/features) | Main menu: `🛍️ Shop` / `Track Order` / `Help` |
| **List messages** | Max **10 rows total** per list [2](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages/) | Paginated categories, products, FAQs (built for 100+ items) |
| **CTA buttons** | URL link or call button [1](https://hyperleap.ai/whatsapp-business-api/features) | `Pay Now` (Paystack link), `Call us` |
| **Search** | Bot-side keyword search (custom code) | `find gown` jumps to matches |
| **Images** | Photo per product when links exist | Free hosting (ImgBB/Imgur/Cloudinary) — text-only until then |
| **Templates** | Pre-approved msgs for business-initiated chat; submission is free [1](https://hyperleap.ai/whatsapp-business-api/free/) | Payment confirmations, shipping updates (small fee each — optional) |
| **Webhooks + REST** | Real-time messages + receipts, free [1](https://hyperleap.ai/whatsapp-business-api/free/) | Bot ↔ orders ↔ payments ↔ admin alerts |

## 3. Architecture (₦0 stack)

```
Customer WhatsApp
      ↕ (service chats = FREE, unlimited)
Meta WhatsApp Cloud API — API access free, no monthly fee [3](https://gurusup.com/blog/whatsapp-cloud-api)
      ↕  (webhook + REST)
Your backend (Node.js) on Render FREE tier (750 hrs/mo, no card) [1](https://hostgage.com/best-free-nodejs-hosting/)
   ├── bot logic (shop/search/order/track/FAQs/handover) — DONE in src/
   ├── payments (Paystack links + webhook verify; manual mode if no key)
   ├── dedupe (Meta retries safe — needed for free-tier cold starts)
   └── data as JSON files (products/orders/tickets) — free DB (Supabase/Neon) later [3](https://hatchable.com/articles/state-of-free-web-hosting-in-2026)
      ↕
Free keep-alive pinger (cron-job.org / UptimeRobot free) — stops Render sleep
      ↕
You (admin) — alerts on your own WhatsApp, ₦0
```

**Why this stays free:** one Render free service ≈ 720 hrs/mo fits inside the
750-hr free pool [1](https://hostgage.com/best-free-nodejs-hosting/); support chats
are unlimited-free [5](https://hyperleap.ai/blog/whatsapp-business-api-pricing-guide-2026);
Paystack costs nothing until a customer pays [3](https://cartmor.com/blog/how-to-accept-paystack-payments-online-store).

## 4. Conversation design (v1)
`Hi` → buttons: **🛍️ Shop / Track Order / Help** (+ type `human` anytime).
- **Shop** → categories (paged) → products (paged) → photo+price+stock → `Order This` → qty → name → phone → address → **pay** (Paystack link if configured, else manual transfer + ref).
- **Track** → order ID → status + ETA.
- **Help** → FAQ list (delivery, returns, payment, products) + complaint form + human.
- **Human handover** → bot pauses, you get alert, `/resume <number>` hands back.
- **Paid flow** → customer replies `paid` → you verify (manual) or webhook auto-confirms (Paystack).

## 5. Payments — 🔒 MANUAL LOCKED (auto parked; details in PAYMENTS.md)
1. **Manual mode (₦0 forever):** transfer + exact amount + unique ref as narration + `paid` keyword + you confirm. Works day 1.
2. **Paystack auto-confirm (₦0 to set up):** no setup/monthly fee, test mode free; only 1.5% + ₦100 per successful local transaction (capped ₦2,000; ₦100 waived under ₦2,500) [3](https://cartmor.com/blog/how-to-accept-paystack-payments-online-store) + 7.5% VAT on the fee [1](https://brands.ng/read-this-paystack-review-before-using-the-app/). Webhook matches ref + amount → auto-confirms.
3. **OPay direct / via Flutterwave (later):** dynamic virtual accounts per order [4](https://apis.io/providers/opay/) — add when volume justifies it.

## 6. Meta setup checklist (all free)
1. [ ] Meta Developer account + App → add **WhatsApp** product (free, sandbox test number included [3](https://gurusup.com/blog/whatsapp-cloud-api)).
2. [ ] Business Manager (free) → verify later with CAC docs (needed for production limits + display name).
3. [x] Bot phone number: 0815 Business line (migrates off the app at go-live — $0, no new SIM).
4. [ ] Permanent token (system user) + Phone Number ID — free.
5. [ ] Deploy backend to Render free → set Meta webhook to `https://YOUR-APP.onrender.com/webhook`.
6. [ ] Add free keep-alive pinger hitting `/` every 5–10 min.
7. [ ] Test with your phone → go live. Templates only if/when you want proactive updates.

## 7. Cost table — honest ₦0 breakdown
| Item | Cost | Notes |
|---|---|---|
| WhatsApp Cloud API access | **₦0** — no monthly fee [3](https://gurusup.com/blog/whatsapp-cloud-api) | Direct (no BSP = no ₦90k platform fee) |
| Support chats (customer starts) | **₦0 unlimited** [5](https://hyperleap.ai/blog/whatsapp-business-api-pricing-guide-2026) | = 95% of this bot's traffic |
| Hosting (Render free + pinger) | **₦0** [1](https://hostgage.com/best-free-nodejs-hosting/) | Sleeps when idle; pinger keeps it warm |
| Domain | **₦0** (`*.onrender.com`) | Custom domain later (~$10/yr, optional) |
| Database | **₦0** (JSON files now; Supabase/Neon free later) | |
| Product photos | **₦0** (ImgBB/Imgur direct links, no account) [3](https://www.smashingapps.com/7-best-free-image-hosting-and-photo-sharing-websites/) | |
| Paystack setup + test | **₦0** | Only % on successful sales [3](https://cartmor.com/blog/how-to-accept-paystack-payments-online-store) |
| New SIM | ₦0 — cancelled | 0815 becomes the bot; nothing to buy |
| Proactive templates (optional) | ~$0.0067/utility convo (Nigeria) | Skip until you're selling — reply inside 24h windows = free |
| **Total to launch** | **≈ ₦0** | |

**Upgrade triggers (only when money is coming in):** Render $7/mo Starter when free sleep annoys customers; Utility templates for shipping updates (~₦10 each); custom domain.

## 8. Build phases
| Phase | What | Cost | Time |
|---|---|---|---|
| **0. Free accounts + SIM** | GitHub, Render, Meta, (Paystack test) | ₦0 | 1–2 days |
| **1. MVP bot** | Shop/search/order/track/FAQs/handover/manual pay — CODE DONE, needs your data (see ONBOARDING.md) | ₦0 | 1 week after you send Batch 1 |
| **2. Auto-payments** | Paystack live key + webhook → auto-confirm | ₦0 setup | 2–3 days |
| **3. Photos + polish** | Free image links, more FAQs, templates (optional) | ₦0 | ongoing |
| **4. Dashboard + growth** | Admin site, ads, AI answers | free tiers first | later |

## 9. Compliance gotchas
- Reply freely within 24h of customer's message; after that only templates.
- Promos need opt-in. No spam — number gets banned.
- One number = API only (can't also run WhatsApp app on it).
- Keep `Talk to Human` escape everywhere.

## 10. What I need from you → see ONBOARDING.md
Send **Batch 1 (Q1–Q10)** + products CSV and I'll configure everything.
