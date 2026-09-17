# 📋 Onboarding: everything to send me (launch for ₦0)

Answer the questions below and send them back in chat (copy-paste is fine).
**You don't need everything at once** — send **Batch 1** first and I'll start
building. Batches 2–3 can follow any time.

> 💰 Total cost to launch: **₦0** (see "Free accounts to create" at the bottom).
> Only exception: a new SIM for the bot (~₦500–₦1,000 one-time, if you don't have a spare line).

---

## ✅ RECEIVED 16 Sep — already configured!
- **Shop name: Paragon Hub** ✅
- **57 services, 10 categories** with all prices (Website Design, Graphic Design, TikTok/IG/YouTube/X/Facebook/Telegram boost, Traffic, Bundles)
- **Delivery times** (boost instant–8h, design timelines) + **payment-before-work / appointment-only** policy → loaded into bot FAQs
- **Refund + revision + cancellation + installment policies** → loaded into bot FAQs; **50/50 deposits auto-applied on orders ≥ ₦20,000** (new `/balance` command)
- Price ranges (e.g. ₦30,000–₦50,000) → bot runs **quote mode** for custom services (`/quote` command for you)
- **Q1–Q5 FAQs** (delivery, safety, real engagement, custom packages, referrals) → loaded as bot help topics
- **Brand voice**: Friendly but Professional + tagline *"Fast. Creative. Affordable. That's The Paragon Way! 💪🏽"* on all key messages + **numbered options everywhere** (tap or reply 1/2/3)
- **Q2 admin number: 09063932487 ✅ CONFIRMED**
- **Q7 account: OPay 9063932487 - Jibril Abdullahi Onoruoiza ✅ CONFIRMED**
- **Q3 city: Kogi** ✅
- **Q15 Paystack: NO** → manual transfer mode first, Paystack later (free, 10-min switch)
- **Q16 Facebook: YES** ✅ → Meta developer setup unblocked
- Q11 spare SIM/number for bot: coming LATER → plan: test on Meta sandbox first, go live when SIM arrives
- **Native WA catalog + cart: CLARIFIED ✅** → bot receives cart orders + sends storefront button (code ready in `src/cart.js`); Commerce setup = Phase 2 after photos (see `CATALOG.md`)
- **Payments: MANUAL LOCKED 🔒** → auto-confirm (Paystack/OPay/Flutterwave) parked; transfer + `paid` + `/paid` is the way
- **Proof galleries: BUILT, needs images** → send 2–4 sample images each for: logos, flyers, websites, boost before/after (ImgBB links or phone pics)
- **Referral program: AUTOMATIC ✅** → codes, tracking, rewards + discounts apply themselves, tap-only UX everywhere (see CAPABILITIES §7); optional: BOT_NUMBER in .env enables tap-to-share links
- **Payment approvals: TAP-TO-APPROVE ✅** → customer sends bank ref → you tap ✅ Approve → customer auto-confirmed; `pending` = live dashboard; cloud backup keeps orders safe (needs 15-min Supabase setup, LAUNCH.md Step 8)

## ⏳ STILL NEEDED — send these next
- [ ] Spare SIM for bot number (later — sandbox testing first)
- [ ] Proof images (2–4 per category: logos, flyers, websites, boost before/after)
- [ ] Hosting check: was your old project on Render or Railway? (If Railway, free credit is likely gone → we'll use Render; either way you just log in yourself, no passwords to me)
- [ ] Meta App status: created / started-but-stuck / not started (LAUNCH.md Step 1)
- [ ] Number decision: NEW SIM for the bot (recommended) vs moving your current Business number off the app (free API can't keep both — see CAPABILITIES §6)
- NOT needed: Facebook Page link, WA username, any passwords — the API doesn't use them

## 🥇 BATCH 1 — must-have (bot can't launch without these)

**Q1. Shop name?**
Example: `Adaeze Fashion Hub`

**Q2. Your WhatsApp number (admin)?**
Country code, no `+`. Example: `2348012345678`
(You get order alerts + handover requests here.)

**Q3. City / area?**
Example: `Lekki, Lagos` — used for delivery talk + ETAs.

**Q4. What do you sell? List your categories.**
Example: `Gowns, Shoes, Hair, Bags`

**Q5. Your products (the big one).**
Fill the spreadsheet template: **`data/products_template.csv`**
Columns: `category_id, category_title, product_id, name, price, sizes, description, image_url, stock`
- `sizes` separated by `|` → e.g. `S|M|L|XL`
- `image_url` can be **empty** — bot works with text until photos are ready
- No commas inside fields (write `Gowns and Dresses`, not `Gowns, Dresses`)
- Send it back as a file, or paste rows in chat — either works.

**Q6. Delivery fees + zones?**
Example:
`Lagos island/mainland: ₦2000, 1-2 days. Outside Lagos: ₦3500+, 3-5 days. Free delivery above ₦50000 in Lagos.`

**Q7. Account details for manual payments?**
Example: `GTB 0123456789 - Adaeze Fashion Hub`
(Shown to customers until Paystack auto-confirm is switched on. Free either way.)

**Q8. Return/refund policy in 2–3 lines?**
Example: `7 days return, item unused with tags. Lagos pickup arranged by us. Refund within 48h of receiving item.`

**Q9. Top 5–10 questions customers ask you?**
Just list them, I'll write the bot's answers (you approve after):
Example:
1. `How much is delivery to Abuja?`
2. `Do you do payment on delivery?`
3. `How do I know my size?`
4. `When will my order arrive?`
5. `Can I return if it doesn't fit?`

**Q10. How should the bot talk?**
Pick one: `Friendly` / `Formal` / `Pidgin mix` / `Your own style (describe it)`

---

## 🥈 BATCH 2 — makes the bot much better (send when ready)

**Q11. Do you have a spare SIM / number for the bot?** `Yes / No`
(It must NOT be a number already on WhatsApp. A new SIM ≈ ₦500–₦1,000.)

**Q12. Business hours?**
Example: `Mon–Sat 9am–7pm. Bot replies 24/7, humans reply in work hours.`

**Q13. How do you dispatch orders?**
Example: `GIG Logistics + a dispatch rider for Lagos`

**Q14. Payment methods you accept today?**
Example: `Bank transfer, OPay, Paystack link`

**Q15. Do you have a Paystack account?** `Yes / No / What's that?`
(Free to create, no monthly fee — only small % when you get paid. I'll guide you.)

**Q16. Do you have a Facebook account?** `Yes / No`
(Needed for Meta Business setup — free. Business verification with CAC docs helps but we can start in test mode.)

**Q17. Instagram / Facebook / TikTok page links?**
Example: `instagram.com/adaeze.fashion`
(Bot can share them + we can add Click-to-WhatsApp buttons later.)

**Q18. Product photos — what's the situation?**
`On my phone / Will snap this week / No camera access / Help me plan this`
(Tip: free hosting like ImgBB/Imgur gives direct links with no account.)

**Q19. What language(s) do customers use?**
Example: `Mostly English, some Pidgin`

**Q20. Any products with variants I should know?**
Example: `Wigs come in 10-30 inches, price changes by length`

---

## 🥉 BATCH 3 — later (only when you're ready to grow)

**Q21.** Logo or brand colors? (for future dashboard/receipts)
**Q22.** Any promos/discounts? (e.g. `10% off first order`)
**Q23.** How do return pickups work for you today?
**Q24.** Anything else the bot MUST know about your business?

---

## ✂️ Copy-paste answer template (Batch 1)

```
Q1 Shop name:
Q2 Admin number:
Q3 City/area:
Q4 Categories:
Q5 Products: (attached CSV / pasting below)
Q6 Delivery:
Q7 Account details:
Q8 Return policy:
Q9 Top questions:
1.
2.
3.
4.
5.
Q10 Bot style:
```

---

## 🆓 Free accounts to create (all ₦0 — I'll guide each step)

| # | Account | Cost | Why |
|---|---|---|---|
| 1 | GitHub | Free | Holds your bot code + free deploys |
| 2 | Render (hosting) | Free tier, no card | Runs the bot 24/7 (sleeps when idle — we add a free pinger) |
| 3 | Meta Developer + Business Manager | Free | Official WhatsApp Cloud API access |
| 4 | Paystack | Free, test mode free | Payment links later (only % when paid) |
| 5 | ImgBB or Cloudinary | Free | Product photos when ready |

Don't create anything yet unless you want to — when you send Batch 1,
I'll reply with **click-by-click setup steps** in the right order.

## ⏭️ What happens after you send Batch 1
1. I load your real products, FAQs, delivery + policy into the bot code.
2. I send you setup steps (Meta → Render → connect → test).
3. You test with your own phone, we fix, then you go live. ₦0 spent.
