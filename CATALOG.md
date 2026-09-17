# 🛒 Native Catalog + Add-to-Cart + Bot (Phase 2 guide)

This is the flow you described: customer opens your **real WhatsApp catalog**,
adds items to **cart**, taps **Send** — and the **bot takes over automatically**
(checkout → payment → confirmation). It is 100% possible on the Cloud API,
and the bot code for it is **already written** (`src/cart.js`). This doc covers
what YOU need to do in Meta's tools to switch it on — when you're ready
(photos first!). The chat-shop keeps working either way.

## How it works (end to end)

```
Customer taps "View catalog" (bot button / your profile / wa.me/c/ link)
      → browses NATIVE catalog UI → adds to cart → taps Send
      → Meta delivers a STRUCTURED order webhook (not plain text):
        type "order" + product_items [{ product_retailer_id, quantity, item_price }]
      → Bot matches retailer_ids (= our codes T001, W001...) to products.json
      → Bot replies cart summary + 3-step checkout (name → phone → details)
      → Payment link (or manual transfer) → auto-confirm → you get admin alert
```

Key facts:
- The cart arrives as `type: "order"` with a `product_items` array (sku, qty,
  shown price) — never as a text message [2](https://www.negocionoautomaticobr.com.br/blog/whatsapp/receber-pedido-catalogo-whatsapp-cloud-api-webhook-order-passo-a-passo).
- `product_retailer_id` is **your own sku from the feed**, not a Meta id [2](https://www.negocionoautomaticobr.com.br/blog/whatsapp/receber-pedido-catalogo-whatsapp-cloud-api-webhook-order-passo-a-passo) —
  that's why our feed generator reuses T001/W001/etc: matching is exact.
- The bot **reconciles prices against its own catalog** instead of blindly
  trusting the webhook price, dedupes by message id, and routes unknown SKUs
  to a human instead of guessing — the recommended best practices [2](https://www.negocionoautomaticobr.com.br/blog/whatsapp/receber-pedido-catalogo-whatsapp-cloud-api-webhook-order-passo-a-passo).

## What the bot already does (no action needed)
- [x] Receives `order` webhooks (`index.js` → `cart.js`)
- [x] Multi-item totals, 50/50 deposits, Paystack/manual payment, tracking refs
- [x] Quote mode for range-priced + unrecognized items (`/quote` covers whole carts)
- [x] "🛒 Native catalog + cart" entry row + `catalog` keyword → sends the native
      storefront button today; if the catalog isn't linked yet, customers get a
      graceful fallback and you get a reminder

## What YOU do (when ready — needs product photos!)
Meta **requires an image per item** and reviews catalogs, so do this after
photos exist. All steps are free.

1. [ ] Generate the feed: `node tools/make-commerce-feed.js` → `data/commerce_feed.csv`
2. [ ] Fill `image_link` for every row (free hosting: ImgBB/Imgur/Cloudinary) and
       replace `REPLACE_WITH_BOT_NUMBER` with your real bot link
3. [ ] **business.facebook.com → Commerce Manager → Create catalog**
       (type **E-commerce**, same portfolio that owns your WhatsApp account)
4. [ ] **Catalog → Data sources → Add items → Upload CSV** (`commerce_feed.csv`)
5. [ ] **Connect catalog to WhatsApp**: Business Settings → WhatsApp Accounts →
       your account → **Catalog** → select it [1](https://getkanal.com/blog/whatsapp-business-catalog-shopify)
       (alt path: WhatsApp Manager → Catalog → Choose → **Connect Catalog** [3](https://docs.360dialog.com/docs/messaging/catalogs)).
       Make sure the shopping **cart is enabled** on the connection.
6. [ ] Test: type `catalog` to the bot → tap View catalog → add 2 items → Send →
       bot must reply "🛒 Got your cart!" → complete checkout → pay (test) → confirm
7. [ ] Put `https://wa.me/c/<your-bot-number>` [3](https://docs.360dialog.com/docs/messaging/catalogs)
       in your Instagram/TikTok bios as a second entry point

## Bot → customer product cards (ready in code)
Beyond the storefront button, the bot can push rich product cards (all need the
linked catalog + photos; helpers live in `src/whatsapp.js`):
- **Single product card** — image + price + detail page + add-to-cart [1](https://gurusup.com/blog/whatsapp-cloud-api):
  `sendSingleProduct(to, catalogId, "T001", {...})`
- **Multi-product list** — up to **30 products** in sections, best as a 6–12 item
  shortlist after the customer picks a category [2](https://www.learnmind.ai/blog-post/whatsapp-catalog-message-limits-large-product-lists):
  `sendProductList(to, catalogId, [{title, skus}], {...})`
- All send free-form inside the 24h service window (no template needed when the
  customer messaged first) [2](https://www.learnmind.ai/blog-post/whatsapp-catalog-message-limits-large-product-lists);
  outside it, use approved templates.

## ⚠️ Honest caveats (read before starting)
1. **Images are mandatory** — no photos = no native catalog. Chat-shop works photo-free.
2. **Fixed price required per item** — our 9 range-priced services export at their
   STARTING price with a "final quote in chat" note; the bot auto-switches any
   cart containing them to quote mode, so you never undercharge.
3. **Meta reviews catalogs.** Web/graphic design packages usually pass; **social
   boost items (followers/likes/views) may be REJECTED** under authenticity
   policies. Strategy: upload design items first; add boost items and see —
   whatever gets rejected keeps selling through the chat-shop (zero review risk).
4. One number = API **or** app, not both. Your API (bot) number's catalog lives
   in Commerce Manager (same look for customers: browse → cart → send).

## Troubleshooting
| Symptom | Fix |
|---|---|
| "View catalog" button errors | Catalog not linked yet (Step 5) or items still in review |
| Cart arrives but bot says "unknown" | Feed `id` ≠ products.json code — re-upload feed from the generator |
| Item shows wrong price in cart | You edited price in products.json but not Commerce — re-upload feed |
| Catalog rejected by Meta | Remove flagged items, appeal; keep selling them via chat-shop |
