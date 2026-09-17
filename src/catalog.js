import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");

// WhatsApp list messages allow max 10 rows total, so we page items
// and reserve rows for navigation (More / Back / Search).
export const PAGE_SIZE = 7;

function readCatalog() {
  try {
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
  } catch {
    return { categories: [], products: [] };
  }
}

export function getCategories() {
  return readCatalog().categories || [];
}

export function getProductsByCategory(catId) {
  return (readCatalog().products || []).filter((p) => p.cat === catId);
}

export function allProducts() {
  return readCatalog().products || [];
}

export function findProduct(id) {
  const needle = String(id || "").toLowerCase();
  return allProducts().find((p) => p.id.toLowerCase() === needle) || null;
}

export function formatPrice(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

/** True for custom services priced as a range (bot enters quote mode). */
export function isRange(p) {
  return !!(p && p.priceMin && p.priceMax);
}

/** "₦12,000" for fixed items, "₦30,000 – ₦50,000" for quote ranges. */
export function formatPriceFor(p) {
  if (!p) return formatPrice(0);
  if (isRange(p)) return `${formatPrice(p.priceMin)} – ${formatPrice(p.priceMax)}`;
  return formatPrice(p.price || 0);
}

export function paginate(items, page = 0, perPage = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  return {
    items: items.slice(safePage * perPage, safePage * perPage + perPage),
    page: safePage,
    totalPages,
    total,
    hasMore: safePage < totalPages - 1,
  };
}

/** Keyword search across id, name, description. Best matches first. */
export function searchProducts(query, limit = 8) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored = [];
  for (const p of allProducts()) {
    const name = (p.name || "").toLowerCase();
    const desc = (p.desc || "").toLowerCase();
    const id = (p.id || "").toLowerCase();
    if (id === q) {
      scored.push({ p, score: 100 });
      continue;
    }
    // every word must appear somewhere
    const hay = `${id} ${name} ${desc}`;
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    if (name.startsWith(q)) score += 50;
    if (name.includes(q)) score += 30;
    if (id.includes(q)) score += 20;
    score += words.filter((w) => name.includes(w)).length * 5;
    scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.p);
}
