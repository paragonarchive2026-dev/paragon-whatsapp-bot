/**
 * WhatsApp Cloud API sender library (API v21.0).
 * Every message type the Paragon Hub bot can send, in one place.
 * Free-form messages only work inside the 24h customer-service window;
 * outside it, use approved templates (sendTemplate / sendCarouselTemplate).
 */
import axios from "axios";

const API_VERSION = "v21.0";
const TOKEN = () => process.env.WHATSAPP_TOKEN || "";
const PHONE_ID = () => process.env.PHONE_NUMBER_ID || "";
const CATALOG_ID = () => process.env.WHATSAPP_CATALOG_ID || "";

async function api(payload) {
  if (!TOKEN() || !PHONE_ID()) {
    throw new Error("WhatsApp not configured: set WHATSAPP_TOKEN + PHONE_NUMBER_ID");
  }
  const res = await axios.post(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_ID()}/messages`,
    { messaging_product: "whatsapp", ...payload },
    { headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, timeout: 20000 }
  );
  return res.data;
}

const mediaObj = (linkOrId) =>
  String(linkOrId || "").startsWith("http") ? { link: linkOrId } : { id: linkOrId };

// ---- Basic ----
export async function sendText(to, text) {
  return api({ to, type: "text", text: { body: String(text).slice(0, 4096) } });
}

export async function sendReaction(to, messageId, emoji) {
  if (!messageId) return null;
  return api({ to, type: "reaction", reaction: { message_id: messageId, emoji } });
}

export async function markAsRead(messageId) {
  if (!messageId || !TOKEN() || !PHONE_ID()) return null;
  try {
    await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_ID()}/messages`,
      { messaging_product: "whatsapp", status: "read", message_id: messageId },
      { headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, timeout: 10000 }
    );
  } catch { /* read receipts are best-effort */ }
  return null;
}

// ---- Interactive: reply buttons (max 3, 20 chars each) ----
export async function sendButtons(to, body, buttons, { header, footer, headerImage } = {}) {
  const interactive = {
    type: "button",
    body: { text: String(body).slice(0, 1024) },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: "reply",
        reply: { id: b.id, title: String(b.title).slice(0, 20) },
      })),
    },
  };
  if (headerImage) interactive.header = { type: "image", image: mediaObj(headerImage) };
  else if (header) interactive.header = { type: "text", text: String(header).slice(0, 60) };
  if (footer) interactive.footer = { text: String(footer).slice(0, 60) };
  return api({ to, type: "interactive", interactive });
}

// ---- Interactive: list menu (max 10 rows total) ----
export async function sendList(to, body, buttonText, sections) {
  return api({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: String(body).slice(0, 1024) },
      action: {
        button: String(buttonText || "View").slice(0, 20),
        sections: sections.map((s) => ({
          title: String(s.title || "").slice(0, 24),
          sections: undefined,
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: [...String(r.title)].slice(0, 24).join(""),
            ...(r.description ? { description: [...String(r.description)].slice(0, 72).join("") } : {}),
          })),
        })),
      },
    },
  });
}

// ---- Interactive: branded URL button (payment links) ----
export async function sendUrlButton(to, body, label, url, { footer } = {}) {
  const interactive = {
    type: "cta_url",
    body: { text: String(body).slice(0, 1024) },
    action: { name: "cta_url", parameters: { display_text: String(label).slice(0, 20), url } },
  };
  if (footer) interactive.footer = { text: String(footer).slice(0, 60) };
  return api({ to, type: "interactive", interactive });
}

// ---- Interactive: request customer's location ----
export async function sendLocationRequest(to, body) {
  return api({
    to,
    type: "interactive",
    interactive: {
      type: "location_request_message",
      body: { text: String(body).slice(0, 1024) },
      action: { name: "send_location" },
    },
  });
}

// ---- Media ----
export async function sendImage(to, linkOrId, caption = "") {
  return api({ to, type: "image", image: { ...mediaObj(linkOrId), ...(caption ? { caption: String(caption).slice(0, 1024) } : {}) } });
}
export async function sendVideo(to, linkOrId, caption = "") {
  return api({ to, type: "video", video: { ...mediaObj(linkOrId), ...(caption ? { caption: String(caption).slice(0, 1024) } : {}) } });
}
export async function sendAudio(to, linkOrId) {
  return api({ to, type: "audio", audio: mediaObj(linkOrId) });
}
export async function sendDocument(to, linkOrId, caption = "", filename = "") {
  return api({
    to,
    type: "document",
    document: { ...mediaObj(linkOrId), ...(caption ? { caption: String(caption).slice(0, 1024) } : {}), ...(filename ? { filename } : {}) },
  });
}
export async function sendSticker(to, linkOrId) {
  return api({ to, type: "sticker", sticker: mediaObj(linkOrId) });
}

// ---- Templates (proactive / outside-24h; paid by category from message #1) ----
export async function sendTemplate(to, name, lang = "en", components = []) {
  return api({
    to,
    type: "template",
    template: { name, language: { code: lang }, ...(components.length ? { components } : {}) },
  });
}

/**
 * Marketing carousel template: 2–10 swipeable cards.
 * cards: [{ imageUrl?, videoUrl?, bodyVars: [], buttons: [{type:"quick_reply",payload}|{type:"url",suffix?}] }]
 */
export async function sendCarouselTemplate(to, name, lang = "en", cards = [], bodyParams = []) {
  return api({
    to,
    type: "template",
    template: {
      name,
      language: { code: lang },
      components: [
        ...(bodyParams.length
          ? [{ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: t })) }]
          : []),
        {
          type: "carousel",
          cards: cards.slice(0, 10).map((c, ci) => ({
            card_index: ci,
            components: [
              ...(c.imageUrl ? [{ type: "header", parameters: [{ type: "image", image: { link: c.imageUrl } }] }]
                : c.videoUrl ? [{ type: "header", parameters: [{ type: "video", video: { link: c.videoUrl } }] }]
                : []),
              ...(c.bodyVars?.length
                ? [{ type: "body", parameters: c.bodyVars.map((t) => ({ type: "text", text: t })) }]
                : []),
              ...(c.buttons?.length
                ? c.buttons.slice(0, 2).map((b, i) =>
                    b.type === "url"
                      ? { type: "button", sub_type: "url", index: String(i), parameters: [{ type: "text", text: b.suffix || "" }] }
                      : { type: "button", sub_type: "quick_reply", index: String(i), parameters: [{ type: "payload", payload: b.payload }] }
                  )
                : []),
            ],
          })),
        },
      ],
    },
  });
}

// ---- Flows: send the one-screen order form (Navigate mode, no backend) ----
export async function sendFlowMessage(to, { flowId, flowToken, cta, body, footer }) {
  const interactive = {
    type: "flow",
    body: { text: String(body).slice(0, 1024) },
    action: {
      name: "flow",
      parameters: {
        flow_message_version: "3",
        flow_id: flowId,
        flow_cta: String(cta || "Open").slice(0, 20),
        flow_token: flowToken,
        flow_action: "navigate",
        flow_action_payload: { screen: "ORDER" },
      },
    },
  };
  if (footer) interactive.footer = { text: String(footer).slice(0, 60) };
  return api({ to, type: "interactive", interactive });
}

// ---- Commerce: native storefront / product cards (needs linked catalog) ----
export async function sendCatalogMessage(to, bodyText, thumbnailSku, footerText = "") {
  const interactive = {
    type: "catalog_message",
    body: { text: String(bodyText).slice(0, 1024) },
    action: { name: "catalog_message", parameters: { thumbnail_product_retailer_id: thumbnailSku } },
  };
  if (footerText) interactive.footer = { text: String(footerText).slice(0, 60) };
  return api({ to, type: "interactive", interactive });
}

export async function sendSingleProduct(to, retailerId, bodyText = "") {
  const interactive = {
    type: "product",
    action: { catalog_id: CATALOG_ID(), product_retailer_id: retailerId },
  };
  if (bodyText) interactive.body = { text: String(bodyText).slice(0, 1024) };
  return api({ to, type: "interactive", interactive });
}

/** sections: [{ title, product_items: [{ product_retailer_id }] }] (max 30 items) */
export async function sendProductList(to, bodyText, buttonText, sections) {
  return api({
    to,
    type: "interactive",
    interactive: {
      type: "product_list",
      body: { text: String(bodyText).slice(0, 1024) },
      action: {
        button: String(buttonText || "View items").slice(0, 20),
        catalog_id: CATALOG_ID(),
        sections,
      },
    },
  });
}

// ---- Media plumbing: download customer media, upload, relay to admin ----
export async function mediaUrl(mediaId) {
  const res = await axios.get(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
    timeout: 15000,
  });
  return res.data?.url;
}

export async function mediaBytes(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  if (!res.ok) throw new Error(`media download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function uploadBytes(buffer, mimeType, filename = "file") {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), filename);
  form.append("type", mimeType || "application/octet-stream");
  form.append("messaging_product", "whatsapp");
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_ID()}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN()}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data?.id) throw new Error(`media upload failed: ${JSON.stringify(data).slice(0, 200)}`);
  return data.id;
}

/** Forward a customer file (receipt, brief) to the admin number. */
export async function relayMedia(to, mediaId, { kind = "image", caption = "", filename = "" } = {}) {
  const url = await mediaUrl(mediaId);
  const buf = await mediaBytes(url);
  const mime =
    kind === "video" ? "video/mp4"
    : kind === "audio" ? "audio/ogg"
    : kind === "document" ? "application/pdf"
    : "image/jpeg";
  const newId = await uploadBytes(buf, mime, filename || `relay-${mediaId}`);
  if (kind === "video") return sendVideo(to, newId, caption);
  if (kind === "audio") return sendAudio(to, newId);
  if (kind === "document") return sendDocument(to, newId, caption, filename);
  return sendImage(to, newId, caption);
}
