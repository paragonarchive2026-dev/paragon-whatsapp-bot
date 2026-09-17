# 📚 WhatsApp Bot: EVERYTHING That's Possible (Deep Research, Sep 2026)

The complete map of what the Cloud API can do, what's already live in the
Paragon Hub bot, and the richest/most-visual methods ranked. Status key:
**LIVE** = working today · **READY** = coded + tested, needs your content/dashboard step ·
**N/A** = not useful for you. (Nothing is "later" anymore — every buildable item is built.)

## 🏆 Most-visual methods, ranked (your "make it look good" list)
1. **Native catalog + product cards + cart** — real storefront, PDP cards, cart→send. Needs photos + Commerce approval. Receive-side **LIVE**, send-side **READY** (`sendCatalogMessage`, `sendSingleProduct`, `sendProductList`).
2. **Image + buttons in ONE message** (media-header buttons) — e.g. product photo with `Order / Ask` under it. **READY** (`sendButtons(..., { headerImage })`).
3. **Proof galleries** — 2–4 sample images per category (logos, flyers, sites, before/after). Structure **LIVE**, needs your images (`data/proof.json`).
4. **Video demos** — screen recordings, before/after clips (MP4 ≤16MB). **READY** (`sendVideo`).
5. **PDF lookbook / invoice / receipt** (≤100MB). **READY** (`sendDocument`).
6. **Carousel promo templates** — 2–10 swipeable image/video cards with buttons (paid marketing, needs approval + opt-in). **READY** (`sendCarouselTemplate` + spec in `TEMPLATES.md`).
7. Text menus/buttons/lists — always available, zero setup. **LIVE**.
8. **Tap-only UX** — every answer ends in buttons; tracking, paid-matching, re-orders need zero typing. **LIVE** (§7).

## 1. Complete message-type inventory
| # | Type | What customer sees | Limits | Window/cost | Paragon status |
|---|---|---|---|---|---|
| 1 | Text | Formatted message (bold/italic/emoji/links) | 4,096 chars [2](https://ozonetel.com/whatsapp-cloud-api-complete-guide/) | Free in 24h window | **LIVE** |
| 2 | Image | Photo + caption | JPEG/PNG(/WebP), ≤5MB [1](https://docs.expertflow.com/cx/4.9/meta-whatsapp-cloud-api-limitations-key-highlights) [2](https://cedocs.netcore.ai/docs/what-is-the-right-image-size-for-a-whatsapp-template-message); keep <1MB on weak networks [2](https://chatarmin.com/en/blog/whats-app-image-size-guide) | Free in window | **LIVE** (proof packs, product photos, receipt relay) |
| 3 | Video | Playable clip + caption | MP4/3GP H.264+AAC, ≤16MB [1](https://docs.expertflow.com/cx/4.9/meta-whatsapp-cloud-api-limitations-key-highlights) [3](https://help.sleekflow.io/en_US/supported-message-types-on-whatsapp-business-api-cloud-a) | Free in window | **READY** |
| 4 | Audio | Voice-note player | MP3/OGG-OPUS/AAC/AMR, ≤16MB [1](https://docs.expertflow.com/cx/4.9/meta-whatsapp-cloud-api-limitations-key-highlights) [3](https://help.sleekflow.io/en_US/supported-message-types-on-whatsapp-business-api-cloud-a) | Free in window | **READY** (send + receive/relay) |
| 5 | Document | PDF/DOC/XLS/PPT/TXT download | ≤100MB [1](https://docs.expertflow.com/cx/4.9/meta-whatsapp-cloud-api-limitations-key-highlights) [2](https://cedocs.netcore.ai/docs/what-is-the-right-image-size-for-a-whatsapp-template-message) | Free in window | **READY** (receipts, portfolio PDF; receive/relay too) |
| 6 | Sticker | WebP sticker | Static ≤100KB / animated ≤500KB, 512×512 [1](https://docs.expertflow.com/cx/4.9/meta-whatsapp-cloud-api-limitations-key-highlights) [2](https://chatarmin.com/en/blog/whats-app-image-size-guide) | Free in window | **READY** (`sendSticker`; celebrate sticker on orders via `STICKER_CELEBRATE`) |
| 7 | Reaction | Emoji reaction on their message | Standard API feature [3](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/) | Free | **LIVE** (✅ on "paid", 👀 on receipts, 🎉 on orders) |
| 8 | Reply buttons | Up to 3 tappable pills | Max 3, 20 chars each [1](https://gurusup.com/blog/whatsapp-cloud-api) [4](https://chatarmin.com/en/blog/whats-app-api-send-messages) | Free in window | **LIVE** (all menus numbered) |
| 9 | Buttons + media header | Photo/video/doc ABOVE the buttons, one message | Same as 8 + media specs [3](https://developers.cm.com/messaging/docs/whatsapp-interactive-messages) | Free in window | **READY** (`headerImage`) |
| 10 | List menu | Button opening a tap-sheet | Max 10 rows total; titles 24 chars [1](https://gurusup.com/blog/whatsapp-cloud-api) [4](https://chatarmin.com/en/blog/whats-app-api-send-messages) | Free in window | **LIVE** (paginated + numbered) |
| 11 | CTA URL button | Branded link/call button | 1 per message [3](https://developers.cm.com/messaging/docs/whatsapp-interactive-messages) | Free in window | **LIVE** (Pay Now links) |
| 12 | Catalog storefront button | "View catalog" → native browse → cart → send | Needs linked Commerce catalog [3](https://docs.360dialog.com/docs/messaging/catalogs) | Free in window | **READY** (graceful fallback till linked) |
| 13 | Single product card | PDP: image + price + add-to-cart | Needs catalog; 1 item [1](https://gurusup.com/blog/whatsapp-cloud-api) [1](https://support.gupshup.io/hc/en-us/articles/4413103335705-WhatsApp-Interactive-Single-Multi-Product-Messages) | Free in window | **READY** |
| 14 | Multi-product list | Up to 30 product cards in sections | Max 30 total [2](https://www.learnmind.ai/blog-post/whatsapp-catalog-message-limits-large-product-lists) [4](https://www.tyntec.com/helpcenter/docs/channels/whatsapp-business/content-types/product-catalog-messages/); practical shortlist 6–12 [2](https://www.learnmind.ai/blog-post/whatsapp-catalog-message-limits-large-product-lists); 1 catalog per WABA [2](https://www.learnmind.ai/blog-post/whatsapp-catalog-message-limits-large-product-lists) | Free in window | **READY** |
| 15 | Templates (text/media) | Pre-approved proactive msgs | Vars, 3 quick replies, URL button, media header [1](https://gurusup.com/blog/whatsapp-cloud-api); approval ~1min–24h [1](https://gurusup.com/blog/whatsapp-cloud-api) | Paid by category from msg #1 | **READY** (4 specs in `TEMPLATES.md` + `/remind`; needs approval + budget) |
| 16 | Carousel templates | 2–10 swipeable image/video cards + buttons each | Media header mandatory (img ≤5MB/vid ≤16MB), body ≤160 chars, 1–2 same-type buttons/card [3](https://api.support.vonage.com/hc/en-us/articles/22329398546204-Setting-up-WhatsApp-Carousel-Template); ratio 1.91:1 (1125×600) [2](https://chatarmin.com/en/blog/whats-app-image-size-guide); send shape: `carousel`+`cards`+`card_index` [2](https://docs.ycloud.com/reference/whatsapp-messaging-examples) [4](https://docs.360dialog.com/docs/waba-messaging/template-messaging/product-card-carousel-templates) | Marketing rates + opt-in | **READY** (`sendCarouselTemplate` + spec) |
| 17 | Flows (in-chat forms) | Native screens: dropdowns, date pickers | Navigate = static, no backend; Data Exchange = encrypted endpoint [1](https://whatsable.app/blog/whatsapp-flow-feature-explained-for-businesses) [4](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint); completion arrives as `nfm_reply` [5](https://docs.kapso.ai/docs/whatsapp/flows/sending-flows) | Free in window | **READY** (Navigate flow: JSON + send + auto-order; see `FLOWS.md`) |
| 18 | Order receiving | Structured cart webhook (sku/qty/price) | Needs linked catalog + cart enabled [2](https://www.negocionoautomaticobr.com.br/blog/whatsapp-receber-pedido-catalogo-whatsapp-cloud-api-webhook-order-passo-a-passo) | Free (inbound) | **LIVE** (`src/cart.js`) |
| 19 | Location request / receive | System prompt for location / customer shares pin | Niche interactive types [3](https://developers.cm.com/messaging/docs/whatsapp-interactive-messages) | Free in window | **READY** (request helper + receive handling) |
| 20 | Typing.../read receipts | Blue ticks + presence | Automatic via API | Free | **LIVE** (read receipts; "typing…" can't be forced — Meta limitation) |
| 21 | Media relay | Customer's receipt screenshot auto-forwarded to you | Download-then-upload via media endpoint [3](https://stackoverflow.com/questions/67881798/how-to-download-media-files-in-whatsapp-api-which-send-users) [1](https://github.com/chatwoot/chatwoot/pull/15702) | Free | **LIVE** (`relayMedia` in `src/growth.js`) |
| 22 | Referrals + auto-discounts | Share link → friend taps → rewards apply at checkout | Organic attribution = pre-filled wa.me text (friend presses send — 1 tap, no typing) [2](https://elido.app/en/blog/whatsapp-business-deep-links); webhook `referral` object exists for paid ads only [1](https://seresa.io/blog/attribution-measurement/click-to-whatsapp-is-your-woocommerce-attribution-black-hole); buttons/points redemption best practice [2](https://www.chatarchitect.com/news/whatsapp-loyalty-programs-building-referral-and-reward-systems) | Free in window | **LIVE** (`src/rewards.js`; milestones auto-grant + auto-apply) |
| 23 | Tap-to-approve payments | Admin card (order + bank ref + Approve/Decline) → one tap confirms | Admin-only actions, double-tap safe | Free | **LIVE** (`src/admin.js`; `pending` = dashboard, `/paid` still works) |

API version pinned: **v21.0** [4](https://chatarmin.com/en/blog/whats-app-api-send-messages).

## 2. Proof / examples system ("show me what you've done" — YES, built)
- Customer types **`proof` / `sample` / `example` / `portfolio` / `past work`** (or FAQ → *See proof & past work*) → gallery menu: 1 Logos · 2 Flyers · 3 Websites · 4 Boost before/after.
- Bot sends **2–4 images** + caption + `Order Now / More Proof / Talk to Human` buttons — fully tap-only, zero typing.
- Every FAQ answer now ends in buttons too (proof/FAQ → proof is one tap from safety/realness answers).
- Empty pack? Graceful fallback ("packaging fresh samples — type *human*") + admin nudge to fill `data/proof.json`.
- **What to send me:** 2–4 images per category (JPG/PNG, ideally <1MB each [2](https://chatarmin.com/en/blog/whats-app-image-size-guide); square-ish shows best in chat). Phone pics are fine — I'll host-link them free (ImgBB/Cloudinary).
- Receipt screenshots from customers are auto-relayed to the admin (row 21) — and if the bot was waiting for a bank transaction ID, the screenshot auto-submits the payment for approval.

## 3. Cart — both directions, clarified
- **Bot → customer:** storefront button (`catalog_message`) → customer browses natively → cart → Send [3](https://docs.360dialog.com/docs/messaging/catalogs). Single PDP cards + 30-item shortlists also ready. All free-form inside the 24h window (no template needed when they messaged first) [2](https://www.learnmind.ai/blog-post/whatsapp-catalog-message-limits-large-product-lists).
- **Customer → bot:** cart arrives as structured `order` webhook (your SKUs, qty, shown price) [2](https://www.negocionoautomaticobr.com.br/blog/whatsapp-receber-pedido-catalogo-whatsapp-cloud-api-webhook-order-passo-a-passo) → bot checks out (name → phone → details → payment/quote). **LIVE** today.
- Requirements (Phase 2): photos (mandatory), Commerce catalog linked to WABA, cart enabled. Until then, every catalog entry point degrades gracefully to the chat-shop. Full steps: `CATALOG.md`.

## 4. Payments — 🔒 MANUAL LOCKED (your decision)
Auto-confirm (Paystack/OPay/Flutterwave) is **parked** — zero payment integrations active.
The manual loop (all **LIVE**): transfer exact amount + ref-as-narration → reply `paid` →
bot smart-matches it to their order + asks for the bank transaction ID → you get an
approval card (order + their bank ref + **Approve/Decline buttons**) → one tap confirms
and the customer is auto-notified. Deposits tracked; `/balance` collects the rest before
delivery; `/paid` still works as the typing alternative. Unpark auto-confirm anytime:
paste one key (10 min, no code change). Details: `PAYMENTS.md`.

## 5. Hard limits (what's NOT possible — honest list)
- One number = API **or** app on the standard path (see §6 for the Coexistence exception that needs a paid partner).
- 24h service window: free-form only after THEY message; outside it, approved templates only (paid).
- New numbers start ~250 msgs/24h, scaling with verification + quality rating [4](https://chatarmin.com/en/blog/whats-app-api-send-messages).
- Marketing needs opt-in + approved templates; spam = ban. Task-specific bots (sales/support) are allowed [4](https://chatarmin.com/en/blog/whats-app-api-send-messages).
- No group-chat bots, no voice/video calls, no "typing…" control, no deleting customer messages.
- Lists: no images/prices inside rows (use descriptions); buttons: 3 max; multi-product: 30 max, 1 catalog per account [2](https://www.learnmind.ai/blog-post/whatsapp-catalog-message-limits-large-product-lists).
- Organic referral tracking = pre-filled link text (friend must press send — 1 tap); invisible auto-tracking exists for paid Click-to-WhatsApp ads only [1](https://seresa.io/blog/attribution-measurement/click-to-whatsapp-is-your-woocommerce-attribution-black-hole).
- **No popup/input-dialog API exists** — WhatsApp offers no modal with a text field. The only native-form UI is Flows (input screens with placeholders — built for ordering, see `FLOWS.md`); for single quick inputs like a bank ref, the chat prompt + Skip button is deliberately used because it's faster (paste + send beats opening a form).

## 6. Platform notes (broader research, Sep 2026)
- **Render vs Railway:** Render is the only true free tier left (750 hrs/mo, no card, sleeps 15 min idle — handled with a free pinger) [2](https://hostgage.com/best-free-nodejs-hosting/). Railway is trial-credit-only, then $5/mo minimum [1](https://dev.to/bean_bean/railway-vs-render-which-platform-should-you-deploy-your-nodejs-app-on-in-2026-oh8) — if your old project was on Railway, its free credit is likely gone. Verdict: **deploy on Render** (reuse your old Render account if that's what you had).
- **Render needs git (no upload button):** web services deploy from a linked Git provider repo, public git URL, or Docker image only [1](https://docs.render.com/web-services) — a free GitHub (or GitLab/Bitbucket) account is required; signup is 5 minutes and you'll only ever use the browser Upload button. No plain file-upload path exists.
- **Render free disk is wiped on restart** — any files the bot saves (orders!) vanish on spin-down/restart/redeploy; free services can't attach persistent disks [3](https://stackoverflow.com/questions/76914220/i-deployed-my-backend-on-render-and-its-working-fine-but-after-some-times-my-up) [3](https://unanswered.io/guide/render-free-tier-details). Fix implemented: automatic **Supabase cloud backup** (free Postgres, no card [1](https://justinmckelvey.com/blog/supabase-vs-firebase) [2](https://www.itpathsolutions.com/supabase-free-tier-limits)) — every save mirrors to the cloud, restores on boot. Setup: `LAUNCH.md` Step 8.
- **Your number → API:** standard migration removes the number from the Business app (history stays on the phone, brief downtime, OTP needed) [2](https://help.gohighlevel.com/support/solutions/articles/155000007590-how-to-migrate-your-existing-whatsapp-account-to-whatsapp-cloud-api). Meta's **Coexistence** (same number on app + API) exists but only via paid BSP/partner onboarding — NOT available to direct free API setups like ours [3](https://www.reddit.com/r/whatsapp/comments/1jn1e89/whatsapp_business_cloud_api_can_i_use_the_same/) [1](https://www.reddit.com/r/WhatsappBusinessAPI/comments/1r0x92e/after_migrating_from_whatsapp_business_app_to_api/). So: **use a NEW SIM for the bot**, keep your current Business app untouched.
- **Facebook Page / username:** NOT needed for the bot. The API needs a Meta developer account + Business Portfolio (created with your Facebook login during setup — never share the password). Page link only matters later for verification badge (optional).

## 7. Automation: things you NEVER touch (owner does nothing)
- **Referrals:** codes issued, joins tracked, milestones granted, discounts auto-applied at checkout (chat, cart, flow form, even `/quote`). Free-item rewards zero the total and auto-confirm — you only fulfill, with an alert explaining why it's free.
- **Repeat customers:** greeted by name ("Welcome back!"), name/phone pre-filled (one tap to confirm), orders tracked by tapping (no ref typing), "paid" matched to the right order automatically.
- **Payments:** bank transaction ID collected (typed or receipt screenshot), approval card built, customer auto-notified on approve/decline, deposits/balances computed, receipts relayed, `pending` dashboard always live.
- **Money math:** deposits (50/50 ≥ ₦20,000), balances, reward deductions — all computed; customer + admin notified at every step. Orders + referrals survive Render restarts via cloud backup.
- **Still needs you (~5 min/day):** glance at OPay app + tap ✅ Approve (or `/paid`), send exact prices via `/quote`, do the actual service work, and send proof images once. Everything else runs itself.
