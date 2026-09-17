/**
 * Generate a Meta Commerce catalog CSV feed from data/products.json
 * for the NATIVE catalog + add-to-cart flow (see CATALOG.md).
 *
 * Usage:  node tools/make-commerce-feed.js   →  writes data/commerce_feed.csv
 *
 * Notes:
 * - `id` = our product code (T001, W001...) → arrives back as
 *   product_retailer_id in order webhooks, so matching is exact.
 * - Range-priced services export at their STARTING price; description notes
 *   "final quote in chat" and the bot auto-switches those carts to quote mode.
 * - Meta REQUIRES image_link + link per item — fill them before uploading.
 */
import fs from "node:fs";

const BOT_LINK = "https://wa.me/REPLACE_WITH_BOT_NUMBER";
const catalog = JSON.parse(fs.readFileSync("data/products.json", "utf8"));

const header = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];
const rows = [header];
let ranged = 0;
let noImage = 0;

for (const p of catalog.products || []) {
  const isR = p.priceMin && p.priceMax;
  if (isR) ranged++;
  if (!p.image) noImage++;
  const price = `${isR ? p.priceMin : p.price} NGN`;
  const desc = `${p.desc || ""} (Code: ${p.id}${isR ? " — starting price, final quote confirmed in chat before payment" : ""})`.trim();
  rows.push([p.id, p.name, desc, "in stock", "new", price, BOT_LINK, p.image || "", "Paragon Hub"]);
}

const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
fs.writeFileSync("data/commerce_feed.csv", rows.map((r) => r.map(esc).join(",")).join("\n"));

console.log(`✅ Wrote data/commerce_feed.csv: ${rows.length - 1} items (${ranged} starting-price).`);
if (noImage) console.log(`⚠️  ${noImage} items have NO image — Meta requires images. Fill image_link before upload.`);
console.log(`⚠️  Replace ${BOT_LINK} with your real bot-number link (https://wa.me/234...).`);
