/**
 * Rezervasyon belgesi mail şablonu (10.5) smoke testi.
 *
 *   npx tsx scripts/smoke-reservation-document-mail-template.ts
 */
import assert from "node:assert/strict";
import { renderAgencyMessageTemplate } from "../lib/agency-message-render";
import { toHtmlFromText } from "../lib/email-html";
import {
  RESERVATION_DOCUMENT_SENT_MAIL_BODY,
  RESERVATION_DOCUMENT_SENT_SMS_BODY,
  RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY,
} from "../lib/agency-message-templates/reservation-document-sent";
import { buildReservationDocumentTemplateValues } from "../lib/reservation-document-mail";
import type { ReservationDocumentData } from "../lib/reservation-document-pdf";

const sample: ReservationDocumentData = {
  reservationCode: "116005",
  issuedAt: new Date("2026-07-15T17:29:00+03:00"),
  confirmedAt: new Date("2026-07-15T17:29:00+03:00"),
  guest: {
    fullName: "Nejla Gürgöl",
    identityMasked: "*******",
    phone: "5550000000",
    email: "nejla@tatildeyiz.com.tr",
    address: "—",
  },
  stay: {
    villaName: "Villa Sefa",
    regionLabel: "Seydikemer / Muğla",
    checkIn: new Date("2026-07-18T12:00:00"),
    checkOut: new Date("2026-07-25T12:00:00"),
    checkInTime: "16:00",
    checkOutTime: "10:00",
    nights: 7,
    adults: 2,
    children: 0,
    babies: 0,
  },
  guestRows: [],
  payments: {
    grossPrice: null,
    periodDiscount: null,
    otherDiscount: null,
    netAccommodation: null,
    reservationTotal: null,
    damageDeposit: null,
    prepayment: null,
    prepaymentMethodLabel: "—",
    remainingAtCheckIn: null,
  },
  company: {
    brandName: "tatildeyiz",
    domain: "www.tatildeyiz.com.tr",
    agencyName: "Tatildeyiz",
    companyTitle: "",
    tursabNo: "",
    address: "Girmeler Mah. Nacaklar Sok. No:8/1 D:3 Seydikemer / Muğla",
    phone: "2526180108",
    whatsapp: "2526180108",
    email: "info@tatildeyiz.com.tr",
    logoUrl: "/brands/tatildeyiz/logo.png",
  },
  contractBody: "sözleşme",
};

const values = buildReservationDocumentTemplateValues(sample);
assert.equal(values.SITEADI, "tatildeyiz");
assert.equal(values.SITELOGO, "");
assert.match(values.SITELOGOURL || "", /logo/);
assert.equal(values.GIRISTARIHI, "18.07.2026");
assert.equal(values.CIKISTARIHI, "25.07.2026");
assert.equal(values.GIRISSAATI, "16:00");
assert.equal(values.CIKISSAATI, "10:00");

const mail = renderAgencyMessageTemplate(
  RESERVATION_DOCUMENT_SENT_MAIL_BODY,
  values
);
assert.match(mail, /Sayın Nejla Gürgöl,/);
assert.match(mail, /116005 kodlu rezervasyonunuz konfirme edilmiştir/);
assert.match(mail, /bu e-postanın ekindedir/);
assert.match(mail, /Tesis: Villa Sefa/);
assert.match(mail, /Giriş: 18\.07\.2026 16:00/);
assert.match(mail, /Çıkış: 25\.07\.2026 10:00/);
assert.match(mail, /Adres: Girmeler Mah/);
assert.match(mail, /Telefon: 2526180108 \| E-mail: info@tatildeyiz\.com\.tr/);
assert.doesNotMatch(mail, /\ntatildeyiz\n/);

const html = toHtmlFromText(mail, { logoUrl: "cid:logo@tatildeyiz" });
assert.match(html, /background-color:#FFE566/);
assert.match(html, /cid:logo@tatildeyiz/);

const wa = renderAgencyMessageTemplate(
  RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY,
  values
);
assert.match(wa, /e-posta adresinize gönderilmiştir/);
assert.match(wa, /Adres: Girmeler Mah/);
assert.equal(RESERVATION_DOCUMENT_SENT_SMS_BODY, RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY);

console.log("smoke-reservation-document-mail-template: OK");
