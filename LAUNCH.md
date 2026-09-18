# 🚀 Paragon Hub — Launch Guide (₦0, click-by-click)

Your bot code is **done and tested**. Launch = steps below, all free.
Big win: you can **test everything with Meta's sandbox number** — no spare SIM needed (0815 Business line becomes the bot at go-live). Don't skip Step 0!

**Your pre-filled values (keep handy):**

| Setting | Value |
|---|---|
| Shop name | Paragon Hub |
| Admin number ✅ | 2349063932487 (Messenger line — boss side: approvals, /quote, /paid) |
| Manual account ✅ | OPay 9063932487 - Jibril Abdullahi Onoruoiza |
| City | Kogi |
| Verify token | `paragon-verify-2026` |
| Installments | 50/50 on orders ≥ ₦20,000 (automatic) |
| Mode | Manual transfers first (no Paystack yet — auto-confirm later) |
| Project Gmail ✅ | info.paragonhub@gmail.com (master login for GitHub/Render/Supabase) |
| GitHub ✅ | paragonarchive2026-dev/paragon-whatsapp-bot (public, 36 files pushed) |
| Render URL ✅ LIVE | https://whatsapp-bot-1j6f.onrender.com |
| Meta sandbox ✅ | Test +1-555-163-6741, Phone ID 1254948671045136 (temp token — expires 24h, never stored here) |
| Business line = FUTURE BOT ✅ | 08154936650 — migrates from Business app to API at go-live (customers keep chatting it, bot answers) |
| Other line = ADMIN ✅ | 09063932487 — stays human on Messenger; receives approval cards, runs /quote /paid /balance |

---

## Step 0 — Confirm your details ✅ DONE (16 Sep)
- [x] Admin number — `09063932487` (Messenger line; boss side). 0815 Business line becomes the bot at go-live. OPay 9063932487 stays as bank account.
- [x] OPay `9063932487 - Jibril Abdullahi Onoruoiza` — confirmed
- [x] City: Kogi
- [x] Facebook: yes → Meta setup unblocked · Paystack: later (manual mode first)

---

## Step 1 — Put the code on GitHub (15 mins, free, no coding)

> 🆕 No accounts yet? Do **ACCOUNT_SETUP.md** first (Google → GitHub → Render →
> Supabase → Meta, click-by-click with copy-paste helper prompts), then come back here.

> ⚠️ A GitHub (or GitLab/Bitbucket) account is REQUIRED — Render can only deploy
> from git; there is no plain file-upload for web services. It's a free 5-minute
> signup and you'll only ever use the browser Upload button — no coding, promise.
> "GitHub later" simply means "deploy later" — everything else can be prepared now.

Easiest method (no git commands):
1. Create account on **github.com** (free).
2. Click **+ → New repository** → name it `paragon-whatsapp-bot` → **Public** → Create.
3. Click **Add file → Upload files** → drag in EVERYTHING from the `whatsapp-bot`
   folder **except** `.env` (it has secrets — Render gets those separately).
   Upload: `src/`, `data/products.json`, `data/products_upload.csv`,
   `data/proof.json`, `data/order-flow.json`, `data/commerce_feed.csv`, `tools/`,
   `package.json`, `render.yaml`, `.gitignore`, docs.
   (Skip `data/tickets.json` + `data/referrals.json` if present — those are
   live runtime files, gitignored, and restored from cloud backup anyway.)
4. Click **Commit changes**. Done — your code is online.

## Step 2 — Deploy free hosting on Render (15 mins, free, no card)
1. Go to **render.com** → **Sign up with GitHub** (free).
2. Click **New → Blueprint** → select `paragon-whatsapp-bot` repo.
   (`render.yaml` is auto-detected → plan: **Free**.)
3. Click **Apply**. Render asks for env vars — fill from the table above:
   - `SHOP_NAME` = `Paragon Hub`
   - `ADMIN_PHONE` = `2349063932487`
   - `SHOP_ACCOUNT_DETAILS` = `OPay 9063932487 - Jibril Abdullahi Onoruoiza`
   - `VERIFY_TOKEN` = `paragon-verify-2026`
   - `BOT_NUMBER` = your bot's WhatsApp number (digits only, no +) — enables tap-to-share referral links (add after Step 7 if SIM comes later)
   - `WHATSAPP_TOKEN` + `PHONE_NUMBER_ID` = temporary junk for now (e.g. `todo`)
     — you'll paste the real Meta values in Step 4, then redeploy.
   - Leave Paystack empty (manual mode first).
   - `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` = Step 8 (do before go-live).
4. Click **Deploy** → wait ~3–5 mins → copy your URL:
   `https://paragon-whatsapp-bot.onrender.com` (yours will look like this).

## Step 3 — Meta developer + WhatsApp API (30–60 mins, free)
1. Go to **developers.facebook.com** → **Get Started** → log in with Facebook.
2. **Create App** → choose **Other** → type **Business** → name: `Paragon Hub Bot` → Create.
3. In the App Dashboard → **Add Product** → find **WhatsApp** → **Set up**.
   This creates your WhatsApp Business Account in **test mode** with:
   - a **sandbox phone number** (for testing — no SIM needed!)
   - a temporary token + Phone Number ID.
4. On the **API Setup** page, under "Send and receive messages":
   - Add YOUR personal number as a recipient → verify with the OTP Meta sends you.
   - You can now message the sandbox number from your phone.
5. **Permanent token** (do this once, carefully):
   - Go to **business.facebook.com** → your business → **Business Settings → System Users** → **Add** (name: `bot`) → give it access to your app with
     `whatsapp_business_messaging` permission → **Generate token** → copy it.
   - (If this screen confuses you, tell me — I'll walk you through with screenshots described step by step. The temporary 24h token also works for testing TODAY.)
6. Back in **Render → your service → Environment**: paste the real
   `WHATSAPP_TOKEN` + `PHONE_NUMBER_ID` → **Save** (auto-redeploys).

## Step 4 — Connect the webhook (10 mins)
1. In Meta App Dashboard → **WhatsApp → Configuration**:
   - **Callback URL**: `https://YOUR-APP.onrender.com/webhook` (from Step 2)
   - **Verify token**: `paragon-verify-2026` (must match Render exactly)
   - Click **Verify and Save** → you should see ✅ success.
2. Click **Manage** next to Webhook fields → **Subscribe** to `messages`.
3. From your phone, message the sandbox number: `Hi`
   → Bot should reply with the Paragon Hub welcome + numbered buttons! 🎉

## Step 5 — Keep-alive pinger (10 mins, free, important)
Render free sleeps after ~15 min idle. A free pinger keeps the bot awake:
1. Create free account on **cron-job.org**.
2. **Create cronjob** → Title: `Keep Paragon bot awake`
   → URL: `https://YOUR-APP.onrender.com/` → Schedule: **every 5 minutes** → Create.
3. Done. (One warm service ≈ 720 hrs/mo — inside Render's 750-hr free pool.)

## Step 6 — Full test script (20 mins, do every line)
From your phone (chatting the sandbox number):
- [ ] `Hi` → welcome + tagline + `1/2/3` buttons (branded header on top ✨)
- [ ] Reply `1` → catalogue (numbered categories)
- [ ] Pick a category → pick an item → `1. Order This`
- [ ] Complete order: qty `1` → name → phone → `@testhandle` → manual transfer message shows YOUR OPay details + ref → Track/Menu buttons
- [ ] Check admin alerts arrived on YOUR number (new order message)
- [ ] Reply `paid` → order matched (tap it if several) → send a fake bank transaction ID (or Skip)
- [ ] Check YOUR admin number: 💳 **PAYMENT APPROVAL** card shows the bank ref + ✅ Approve / ❌ Decline buttons
- [ ] Tap ✅ **Approve** → customer gets confirmation instantly; tap ❌ on another → give a reason → customer notified
- [ ] Type `pending` on admin number → dashboard of open orders → tap one → View + Approve
- [ ] (Alternative) As admin: `/paid SHOP-XXX` → same result by typing
- [ ] Quote flow: order Logo Design → brief → admin gets quote request → `/quote SHOP-XXX 10000` → customer gets quote + instructions
- [ ] `track` → your orders list → tap one → status shows
- [ ] `Is my account safe?` → safety FAQ + buttons; `find logo` → search works; `proof` → galleries
- [ ] `refer` → your code + share link; `my rewards` → progress
- [ ] `human` → bot pauses + admin alert → `/resume <number>` → bot back

## Step 7 — Go live (migrate 0815 Business line to the bot — $0, no new SIM)
1. Back up 08154936650's Business chats (if any matter) — this number is LEAVING
   the app to become the bot (history stays on the phone; customers keep messaging
   the same number, the bot answers).
2. Meta Dashboard → **WhatsApp → Phone Numbers → Add phone number** → enter
   08154936650 → verify with SMS/voice OTP → it becomes the production bot number
   (removed from the Business app automatically, ~minutes of downtime).
3. Paste `2348154936650` into Render as `BOT_NUMBER` (referral share-links activate) → Save.
4. Announce it: put the number on your Instagram/TikTok bio + status:
   *"Chat Paragon Hub on WhatsApp — order in seconds! 🛍️"*
5. Later (when sales flow): add Paystack live key in Render → auto-confirm turns on.

## Step 8 — Cloud backup with Supabase (15 mins, free, no card) ⚠️ DO BEFORE GO-LIVE
Render's free filesystem is **wiped on every restart** — without this step, your
orders vanish overnight. Supabase (free Postgres, no card, limits you'll never
hit) keeps a live copy; the bot restores automatically on boot.
1. Sign up on **supabase.com** (free, no card) → **New project** → name `paragon`
   → free plan → set a DB password (save it) → wait ~2 mins.
2. Left menu → **SQL Editor** → **New query** → paste + **Run**:
   ```sql
   create table if not exists kv (key text primary key, value jsonb, updated_at timestamptz default now());
   ```
3. **Project Settings → API**: copy **Project URL** + **service_role** key (secret — server only, never share it).
4. Render → your service → **Environment**: add `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` → **Save** (auto-redeploys).
5. Check Render **Logs**: `cloud restore: nothing missing` = wired ✓. Every order/referral now mirrors to Supabase automatically.
Note: free Supabase projects pause after 7 idle days — the bot keeps working on
local JSON regardless; unpause in the Supabase dashboard to resume backups.

---

## Phase 2 — Native catalog + cart (later, optional)
Your chat-shop works fully WITHOUT this. When ready (photos done + time):
→ follow **CATALOG.md**: generate feed → upload to Commerce Manager → link to
WhatsApp → customers get add-to-cart + send, bot auto-checks-out.
Honest note: Meta requires product images and reviews catalogs — boost
services may be rejected; design packages usually pass. Chat-shop stays as
the always-working fallback.

## 🆘 Troubleshooting
| Symptom | Fix |
|---|---|
| Webhook "Verify failed" | `VERIFY_TOKEN` in Render must EXACTLY equal what you pasted in Meta (`paragon-verify-2026`). No spaces. |
| Bot never replies | Render service asleep + no pinger yet (Step 5); or wrong `WHATSAPP_TOKEN`/`PHONE_NUMBER_ID`. Check Render Logs. |
| Bot replies twice | Meta retried during a cold start — our dedupe usually catches this; if persistent, check pinger is running. |
| Buttons/lists don't render | You're chatting the number from an outdated WhatsApp — update the app. |
| Paystack webhook fails | Signature check needs raw body — already handled; confirm URL is `/webhooks/paystack` and key is the LIVE/TEST matching key. |
| Orders vanished after restart | Step 8 (Supabase backup) not done — do it before go-live; local JSON is wiped on Render free restarts. |
| "Reverify" / limits | Complete Business Verification in business.facebook.com (CAC docs help) to raise messaging limits + get the green tick later. |
