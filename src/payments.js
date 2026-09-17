import axios from "axios";
import crypto from "node:crypto";

/**
 * Payments module — Paystack first (payment links + webhooks),
 * structured so OPay/Flutterwave can be added later behind the same interface.
 * If PAYSTACK_SECRET_KEY is not set, the bot runs in MANUAL mode
 * (transfer details + ref-as-narration + "paid" keyword + admin confirm).
 */

export function paymentsEnabled() {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

/** Create a Paystack payment link. Amount in KOBO. Reference = our order ref. */
export async function createPaymentLink({ email, amountKobo, reference, metadata = {} }) {
  const { data } = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount: amountKobo,
      reference,
      metadata,
      ...(process.env.PAYSTACK_CALLBACK_URL ? { callback_url: process.env.PAYSTACK_CALLBACK_URL } : {}),
    },
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      timeout: 15000,
    }
  );
  if (!data.status) throw new Error("Paystack init failed: " + JSON.stringify(data).slice(0, 300));
  return data.data; // { authorization_url, access_code, reference }
}

/** Server-side verification. NEVER trust the customer's word alone. */
export async function verifyPayment(reference) {
  const { data } = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    timeout: 15000,
  });
  return data; // data.status===true && data.data.status==='success' => paid
}

/** Verify webhook authenticity: HMAC SHA512 of RAW body with secret key. */
export function verifyWebhookSignature(rawBodyBuffer, signature) {
  if (!process.env.PAYSTACK_SECRET_KEY || !signature) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBodyBuffer)
    .digest("hex");
  // timing-safe compare (plain === leaks key info via timing)
  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
