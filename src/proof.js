/**
 * Proof / portfolio galleries ("show me samples / past work / before-after").
 * Images live in data/proof.json (free ImgBB/Imgur/Cloudinary links).
 * Triggered by: FAQ row "See proof & past work", keywords
 * (proof/sample/example/portfolio/past work), or "proof" command.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendText, sendList, sendButtons, sendImage } from "./whatsapp.js";

const SHOP = () => process.env.SHOP_NAME || "our shop";
const ADMIN = () => process.env.ADMIN_PHONE || "";
const TAGLINE = "Fast. Creative. Affordable. That's The Paragon Way! 💪🏽";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROOF_FILE = path.join(__dirname, "..", "data", "proof.json");

// unicode-safe slicing: never splits an emoji in half
const uslice = (s, n) => [...String(s || "")].slice(0, n).join("");
const num = (i, title, max = 24) => `${i + 1}. ${uslice(title, max - `${i + 1}. `.length)}`;

function readProof() {
  try {
    return JSON.parse(fs.readFileSync(PROOF_FILE, "utf8"));
  } catch {
    return { categories: [], packs: {} };
  }
}

export function getProofCategories() {
  return readProof().categories || [];
}

export function getProofPack(id) {
  return (readProof().packs || {})[id] || null;
}

export async function handleProofAction(from, actionId, session = null) {
  // ---- Gallery menu ----
  if (actionId === "proof") {
    const cats = getProofCategories();
    if (!cats.length) {
      await sendText(from, `Our sample gallery is being packaged 📦\nType *human* and we'll DM you recent work right now 👀\n\n${TAGLINE}`);
      return;
    }
    const rows = cats.map((c, i) => ({
      id: `proof_${c.id}`,
      title: num(i, c.title),
      description: uslice(c.blurb || "Tap to view samples", 72),
    }));
    const back = { id: "faqs", title: num(cats.length, "← Back to help") };
    if (session) session.menu = [...cats.map((c) => `proof_${c.id}`), "faqs"];
    await sendList(from, `📸 *${SHOP()} Proof & Past Work*\nPick a category — reply with the number or tap 👇`, "View proof", [
      { title: "Proof galleries", rows },
      { title: "More", rows: [back] },
    ]);
    return;
  }

  // ---- One gallery pack ----
  if (actionId.startsWith("proof_")) {
    const id = actionId.replace("proof_", "");
    const cat = getProofCategories().find((c) => c.id === id);
    const pack = getProofPack(id);
    const images = (pack?.images || []).filter(Boolean);
    if (!pack || !images.length) {
      await sendText(from, `Fresh samples for *${cat?.title || "this category"}* are being packaged 📦\nType *human* and we'll DM you recent work right now 👀\n\n${TAGLINE}`);
      if (ADMIN()) await sendText(ADMIN(), `📸 Customer asked for proof (${id}) but the pack is EMPTY — add image links in data/proof.json.`);
      return;
    }
    await sendText(from, `📸 *${cat?.title || "Proof"}* — ${pack.caption || "recent work"} 👇`);
    for (let i = 0; i < images.slice(0, 4).length; i++) {
      try {
        await sendImage(from, images[i], i === 0 ? (pack.caption || "") : "");
      } catch {
        // skip broken links silently; admin can check logs
        console.error("proof image failed:", images[i]?.slice(0, 80));
      }
    }
    if (session) session.menu = ["shop", "proof", "human"];
    await sendButtons(from, `Like what you see? 😊 Order in seconds, see more, or ask us anything.\n\n${TAGLINE}`, [
      { id: "shop", title: "1. 🛍️ Order Now" },
      { id: "proof", title: "2. 📸 More Proof" },
      { id: "human", title: "3. Talk to Human" },
    ]);
  }
}
