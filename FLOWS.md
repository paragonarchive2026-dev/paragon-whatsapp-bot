# 📝 WhatsApp Flows (one-screen order form)

A Flow is a native mini-form INSIDE the chat — dropdowns + inputs on one screen,
higher completion than step-by-step chat. Ours: customer types **`form`** → picks
service + qty → name → phone → details → Submit → bot instantly creates the
order/quote ticket (same logic as chat orders, incl. manual payment steps).

**Code status:** sending (`sendFlowMessage`), the form definition
(`data/order-flow.json`), and completion handling (`handleFlowDone` in
`src/growth.js`) are all implemented + tested. **Your part:** create the Flow in
Meta's dashboard once (10 min), paste its ID into `.env` as `FLOW_ID`.

## Setup — Option A: visual builder (recommended, no code)

1. Open **WhatsApp Manager** (business.facebook.com → your business → WhatsApp accounts) → **Flows** → **Create flow**.
2. Name: `paragon_order` · Category: `Lead generation` (closest fit) · Type: **Navigate** (static screens — no server endpoint needed).
3. Add ONE screen `START` with these components (mirror `data/order-flow.json`):
   - Heading: "Paragon Hub — quick order"
   - Dropdown `product_id` (required): your top services — value MUST be the real product ID (T001, I007, W001…), label is the friendly name. Add `OTHER` = "Something else".
   - Dropdown `qty`: 1 / 2 / 3 / 5
   - Text input `name` (required), Text input `phone` (required, phone keyboard), Text area `details` (required)
   - Footer button → action **Complete**
4. **Publish** → copy the **Flow ID** (long number) → `.env`: `FLOW_ID=1234567890` → redeploy.
5. Test: message the bot `form` → fill → Submit → order ticket lands + you get the admin alert.

## Setup — Option B: API (uses our JSON file)

```bash
# 1. Create (needs your WABA ID + a Meta access token with whatsapp_business_manage)
curl -X POST "https://graph.facebook.com/v21.0/YOUR_WABA_ID/flows" \
  -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"paragon_order","categories":["LEAD_GENERATION"]}'

# 2. Upload our screens (FLOW_ID from step 1)
curl -X POST "https://graph.facebook.com/v21.0/FLOW_ID/assets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@data/order-flow.json;type=application/json" \
  -F "name=flow.json" -F "asset_type=FLOW_JSON"

# 3. Publish
curl -X POST "https://graph.facebook.com/v21.0/FLOW_ID/publish" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. .env → FLOW_ID=<the id> → redeploy. Done.
```

## Field contract (what the bot expects back)

> 💡 Flows are WhatsApp's ONLY popup-like input UI (no modal/dialog API exists) — TextInput fields support `placeholder` + `helper-text` (used in `data/order-flow.json`). For single quick inputs like a bank transaction ID, the chat prompt + Skip button is deliberately used instead — paste + send is faster than opening a form.

| Flow field name | Goes to | Required |
|---|---|---|
| `product_id` | matched to catalogue (T001…) | yes — unknown IDs get a friendly "use *shop*" fallback, never a crash |
| `qty` | quantity (1–50) | no (default 1) |
| `name` / `phone` / `details` | ticket + admin alert | yes |

Completion arrives as `nfm_reply` → normalized to `flow_done` (`src/index.js`) →
`handleFlowDone` (quote vs fixed+deposit, Paystack link or manual steps, admin alert).
Range-priced picks (e.g. W001) go to quote mode automatically, like chat orders.

## Later upgrade (not needed now)
Live/cascading dropdowns (products change with category) need a **Data Exchange**
Flow + an encrypted server endpoint (key pair, payload encryption). Research says:
ship the Navigate (static) version first, upgrade when volume justifies it. The
completion path stays identical, so nothing breaks when you upgrade.
