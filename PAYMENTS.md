# Payments: transfer-confirm-match design 🇳🇬

> 🔒 **DECISION (16 Sep): MANUAL verification it is.** Owner parked ALL auto-payments
> (Paystack / OPay API / Flutterwave — not free). The loop = transfer exact amount +
> ref-as-narration → customer replies `paid` → you verify in OPay app →
> `/paid <ref> [amount]` → customer auto-notified (+ `/balance`, 50/50 deposits tracked).
> Everything below stays as reference — unpark auto-confirm anytime by pasting one
> key + webhook URL (10 min, no code change).

> 💰 **₦0 summary:** Paystack has **no setup fee, no monthly fee, free test mode**
> — you only pay a small % when a customer actually pays [3](https://cartmor.com/blog/how-to-accept-paystack-payments-online-store).
> Manual transfer mode is **₦0 forever**. Start manual (today) → switch on
> auto-confirm by pasting one key (later). No code change needed.

Goal (your words): customer pays (transfer / OPay-style flow) → backend **confirms the
transaction and matches it with the user's order** → bot auto-confirms on WhatsApp.

## Recommended path: Paystack payment links + webhooks ✅

Why Paystack first, not raw OPay API:
- Best-documented Nigerian flow: **initialize → payment link → webhook → verify**,
  with card, bank transfer, USSD and QR inside one link.
- Test mode simulates transfers without real money; webhooks mirror production [1](https://www.mctaba.com/learn/paystack/paystack-in-nigeria-complete-developer-guide).
- Paystack **dedicated virtual accounts require BVN verification first** in Nigeria
  (async identification step before a DVA can be created) [2](https://www.mctaba.com/learn/paystack/handling-dedicatedaccount-assign-events) —
  payment links skip that friction for v1.
- The exact WhatsApp + Paystack-link pattern is proven: generate link on backend →
  send via WhatsApp → `charge.success` webhook triggers confirmation message [3](https://startmessaging.com/ng/blog/whatsapp-paystack-integration/).

### The flow (already coded in `src/`)
```
1. Customer completes order in chat → bot creates ref  SHOP-K3J9X...1234
2. Bot calls Paystack initialize (amount in KOBO, ref, customer phone in metadata)
3. Bot sends "Pay Now" button (payment link) in WhatsApp
4. Customer pays with card / transfer / USSD on the Paystack page
5. Paystack hits  POST /webhooks/paystack  with charge.success
6. Backend: verify signature → match ref → verify via API → check amount
7. Match OK → ticket marked PAID → bot auto-sends confirmation + you get admin alert
```

### Matching rules (the important part)
| Check | Why |
|---|---|
| **Signature** = HMAC-SHA512 of raw body with secret key, compared to `x-paystack-signature` | Rejects forged webhooks [1](https://www.mctaba.com/learn/paystack/paystack-in-nigeria-complete-developer-guide) |
| **Reference match** (`event.data.reference` → ticket `ref`) | Links the transfer to the exact order/user |
| **Server-side verify** (`GET /transaction/verify/:ref` must be `success`) | Never trust webhook or customer word alone [4](https://www.mctaba.com/learn/nigeria/integrate-paystack-nigeria) |
| **Amount match** (kobo vs `ticket.total × 100`) | Blocks short payments; admin alerted on mismatch |
| **Idempotency** (skip if ticket already `paid`) | Webhooks can be retried/delivered twice |

Also: **ACK webhooks with 200 immediately, then process** — Paystack retries
non-200s, which is why idempotency matters [1](https://www.mctaba.com/learn/paystack/paystack-in-nigeria-complete-developer-guide).

### Manual mode (works TODAY with zero setup)
If `PAYSTACK_SECRET_KEY` is empty, the bot runs in manual mode:
1. Bot shows your account details + exact amount + unique ref as narration.
2. Customer transfers, replies **paid** (or sends the ref).
3. You verify in your bank app / Paystack dashboard, then confirm to the customer.
Upgrade to auto-confirm later by just adding the Paystack key — no code change.

## OPay options (phase 2 — your idea is valid)

**Option A — OPay direct merchant API.** OPay exposes a Cashier/Checkout API:
hosted Express Checkout + server APIs for cards, bank transfer, USSD, OPay wallet
QR and reference codes, with callbacks, status query and refunds [3](https://github.com/api-evangelist/opay).
It can generate a **dynamic virtual account per order and reconcile the inbound
transfer automatically** [4](https://apis.io/providers/opay/). Requires OPay merchant
onboarding + HMAC-signed integration [5](https://www.mctaba.com/learn/nigeria/opay-palmpay-mobile-wallets-nigeria).

**Option B — OPay wallet via Flutterwave.** Flutterwave supports OPay as a payment
method (redirect customer to OPay to authorize), then you verify via transaction
status query or webhook — always checking amount + reference + status before
giving value [1](https://developer.flutterwave.com/docs/opay).

Recommendation: launch with Paystack links (days, not weeks), add OPay direct or
via Flutterwave once volume justifies a second integration. The code is structured
for it — `src/payments.js` is the single place to add providers.

## Setup checklist (Paystack auto-confirm)
1. [ ] Create account on paystack.com → complete KYC (business + bank).
2. [ ] Dashboard → Settings → API Keys: copy **test** secret key first.
3. [ ] Add to `.env`: `PAYSTACK_SECRET_KEY=sk_test_...`
4. [ ] Dashboard → Settings → Webhooks: set `https://YOUR-BACKEND/webhooks/paystack`.
5. [ ] Test: order in chat → pay with test card/transfer → webhook fires → auto-confirm arrives.
6. [ ] Pre-launch: walk the checklist — init, verify, webhook, transfer flow, failed payment [1](https://www.mctaba.com/learn/paystack/paystack-in-nigeria-complete-developer-guide).
7. [ ] Switch to **live** key. Done — no code change.

## Money facts
- Paystack Nigeria fees ≈ 1.5% + ₦100 (local cards; capped), transfers attract small fees — confirm current pricing on paystack.com.
- WhatsApp costs stay the same: support chats free in 24h window; Utility templates ~$0.0067.
