# WhatsApp E-commerce Support Bot (Cloud API + Node.js)

Starter code for Phase 1 of the PLAN.md: welcome menu with buttons, FAQ list,
order tracking (JSON store), step-by-step complaint form, human handover + admin alerts.

**Start here:** `CAPABILITIES.md` = everything the bot can do (visual methods ranked) ·
`LAUNCH.md` = 7-step ₦0 launch guide · `CATALOG.md` = native cart Phase 2 · `PAYMENTS.md` = manual payments (locked).

## Quick start

1. Install Node 18+ then:
   ```bash
   cd whatsapp-bot
   npm install
   cp .env.example .env
   # fill in .env with your Meta values
   npm run dev
   ```

2. Expose locally with ngrok (Meta needs public HTTPS):
   ```bash
   ngrok http 3000
   ```
   Webhook URL = `https://YOUR-NGROK-URL/webhook`

3. In Meta App Dashboard → WhatsApp → Configuration:
   - Callback URL: `https://YOUR-NGROK-URL/webhook`
   - Verify token: same as `VERIFY_TOKEN` in `.env`
   - Subscribe to `messages` field.
   - Add a test recipient phone number and send `Hi`.

4. Try it from your phone:
   - `Hi` → main menu buttons (Shop / Track / Help)
   - Tap `🛍️ Shop` → category → service → price + `Order This` (or `find logo` to search)
   - Fixed-price order: packs → name → phone → username/link → pay (link or transfer)
   - Custom service (price range): brief → you send exact quote via `/quote <ref> <amount>`
   - Tap `Track Order` → paste the SHOP- ref to see live status
   - Admin: `/quote <ref> <amount>` sends quotes · `/paid <ref> [amount]` confirms transfers · `/balance <ref>` sends balance link · 50/50 deposits auto on orders ≥ ₦20,000
   - Native cart: link a Commerce catalog later → carts auto-checkout (see CATALOG.md; feed via `node tools/make-commerce-feed.js`)
   - `proof` → sample galleries (logos / flyers / websites / boost before-after) once you add image links to `data/proof.json`
   - Tap `Help / FAQs` → list message
   - `File complaint` → step-by-step form
   - `Talk to Human` → pauses bot + alerts `ADMIN_PHONE`
   - As admin, reply `/resume 2348012345678` to hand back to bot (use customer number without `+`).

## Deploy for ₦0 (Render free tier + keep-alive)
1. Push this folder to GitHub.
2. Go to **render.com** → New → **Web Service** → connect the repo (or use `render.yaml` blueprint).
   - Build: `npm install` · Start: `npm start` · Plan: **Free** (750 hrs/mo, no card needed).
3. Add env vars from `.env.example` in Render's dashboard.
4. Update Meta webhook URL to `https://YOUR-APP.onrender.com/webhook`.
5. **Keep-alive (important, free):** Render free sleeps after ~15 min idle and
   takes 30–50s to wake — set a free pinger (cron-job.org or UptimeRobot) to hit
   `https://YOUR-APP/` every 5 minutes. One always-warm service ≈ 720 hrs/mo,
   inside the 750-hr free pool.
6. Paystack webhook (later): `https://YOUR-APP/webhooks/paystack`.

Alternatives if Render misbehaves: **Koyeb** free instance (usually no card) or
**Northflank** free (never sleeps, card needed for verification). Railway/Fly.io
have no permanent free tier anymore — skip them on ₦0 budget.
Upgrade only when sales justify it: Render Starter $7/mo (always-on, no sleep).

## Files
- `src/index.js` — Express server + webhook verify/receive (incl. native `order` carts)
- `src/whatsapp.js` — send helpers: text/buttons/list/CTA + image/video/audio/document + catalog/product/template
- `src/bot.js` — conversation logic (shop/catalog, menus, FAQs, order lookup, handover)
- `src/cart.js` — native-cart checkout (cart → name → phone → details → payment/quote)
- `src/proof.js` — proof/portfolio galleries (reads `data/proof.json`)
- `src/growth.js` — Flow-form orders + incoming-media relay (receipts → admin)
- `src/rewards.js` — referral codes, milestones + automatic discounts (zero owner effort)
- `src/catalog.js` — catalogue helpers (categories, products, prices)
- `src/payments.js` — Paystack links (parked; manual mode is live)
- `src/store.js` — JSON order store + paused chats + tickets (swap for DB later)
- `data/orders.json` — sample orders to test tracking
- `data/products.json` + `data/products_upload.csv` — 57 services, 10 categories
- `data/proof.json` — proof gallery image links (fill with your samples)
- `data/commerce_feed.csv` — generated Meta Commerce feed (`node tools/make-commerce-feed.js`)
- `tools/import-products.js` — CSV → products.json importer
- `CAPABILITIES.md` / `PLAN.md` / `PAYMENTS.md` / `CATALOG.md` / `LAUNCH.md` / `ONBOARDING.md` — docs
