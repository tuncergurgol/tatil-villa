/**
 * Takvim WhatsApp link bildirimi — smoke.
 * Çalıştır: npx tsx scripts/smoke-whatsapp-calendar-link-notify.ts
 */
import assert from "node:assert/strict";
import {
  buildWhatsappCalendarLinkNotifySubject,
  buildWhatsappCalendarLinkNotifyText,
  extractWhatsappMessageUrls,
} from "../lib/whatsapp-calendar-link-notify";
import { normalizeWhatsappCalendarPayload } from "../lib/whatsapp-calendar-webhook";

assert.deepEqual(
  extractWhatsappMessageUrls(
    "Villa kapandı https://www.hepsivilla.com/villa-foo bakın."
  ),
  ["https://www.hepsivilla.com/villa-foo"]
);

assert.deepEqual(
  extractWhatsappMessageUrls("www.tatildeyiz.com.tr/villalar/villa-sefa"),
  ["https://www.tatildeyiz.com.tr/villalar/villa-sefa"]
);

assert.deepEqual(
  extractWhatsappMessageUrls("link yok, sadece 1-8 ağustos kapatalım"),
  []
);

assert.deepEqual(
  extractWhatsappMessageUrls(
    "iki link http://bit.ly/abc ve https://example.com/x",
    "https://example.com/x"
  ),
  ["http://bit.ly/abc", "https://example.com/x"]
);

const subject = buildWhatsappCalendarLinkNotifySubject({
  villaNames: ["Villa Fiyona"],
  groupName: "Fiyona Grup",
});
assert.equal(subject, "Takvim WhatsApp — Villa Fiyona — mesajda link");

const text = buildWhatsappCalendarLinkNotifyText({
  groupName: "Fiyona Grup",
  groupExternalId: "120363@g.us",
  villaNames: ["Villa Fiyona"],
  senderName: "Ahmet",
  senderPhone: "905551112233",
  body: "https://www.hepsivilla.com/villa-foo rezervasyon",
  urls: ["https://www.hepsivilla.com/villa-foo"],
});
assert.match(text, /Linkler:/);
assert.match(text, /hepsivilla\.com/);
assert.match(text, /Villa Fiyona/);
assert.match(text, /Ahmet/);

const evolution = normalizeWhatsappCalendarPayload({
  data: {
    key: {
      remoteJid: "120363-test@g.us",
      id: "MSG1",
      fromMe: false,
      participant: "905551112233@s.whatsapp.net",
    },
    pushName: "Ahmet",
    message: {
      extendedTextMessage: {
        text: "Rezervasyon linki",
        canonicalUrl: "https://www.hepsivilla.com/villa-foo",
        matchedText: "https://www.hepsivilla.com/villa-foo",
      },
    },
  },
});
assert.ok(evolution);
assert.equal(evolution!.senderPhone, "905551112233");
assert.deepEqual(
  extractWhatsappMessageUrls(
    evolution!.body,
    evolution!.quotedBody,
    ...evolution!.previewUrls
  ),
  ["https://www.hepsivilla.com/villa-foo"]
);

const fromMe = normalizeWhatsappCalendarPayload({
  groupId: "120363-test@g.us",
  text: "https://example.com",
  fromMe: true,
});
assert.equal(fromMe?.fromMe, true);

console.log("smoke-whatsapp-calendar-link-notify: OK");
