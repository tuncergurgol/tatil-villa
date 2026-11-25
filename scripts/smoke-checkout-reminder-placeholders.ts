import assert from "node:assert/strict";
import {
  buildCheckInInfoShareTemplateValues,
  cleanupAgencyMessageRenderedText,
  formatVillaCheckoutTimeRange,
  formatVillaOriginalNameBlock,
  renderAgencyMessageTemplate,
} from "../lib/agency-message-render";
import { parseBookingDetails } from "../lib/booking-form-details";
import {
  CHECKOUT_REMINDER_GUEST_WHATSAPP_BODY,
  CHECKOUT_REMINDER_OWNER_WHATSAPP_BODY,
} from "../lib/agency-message-templates/scheduled-messages";

const company = {
  agencyName: "Tatil Villacısı",
  brandName: "Tatil Villacısı",
  companyTitle: "Tatil Villacısı",
  domain: "www.tatildeyiz.com.tr",
  logoUrl: "",
  email: "info@example.com",
  phone: "",
  address: "",
};

const baseInput = {
  reservationCode: "TV-12345",
  shareCode: "clxxxxxxxxxxxxxxxx",
  guestName: "Abdülkadir Kılıç",
  guestEmail: "guest@example.com",
  guestPhone: "+905551112233",
  villaName: "Bungalov Masal",
  villaOriginalName: "",
  villaRegion: "Fethiye",
  villaCheckInTime: "16:00",
  villaCheckOutTime: "10:00",
  checkIn: new Date("2026-08-05"),
  checkOut: new Date("2026-08-12"),
  adults: 2,
  children: 0,
  babies: 0,
  pets: 0,
  details: parseBookingDetails({}),
  totalPrice: 10000,
  greeterName: "Mehmet Yılmaz",
  greeterPhone: "+905559998877",
  company,
};

assert.equal(formatVillaCheckoutTimeRange("10:00"), "09:00-10:00");
assert.equal(formatVillaOriginalNameBlock(""), "");
assert.equal(formatVillaOriginalNameBlock("Villa Orijinal"), " (Villa Orijinal)");

const guestValues = buildCheckInInfoShareTemplateValues({
  ...baseInput,
  audience: "guest",
  recipientName: baseInput.guestName,
});
const guestRendered = cleanupAgencyMessageRenderedText(
  renderAgencyMessageTemplate(CHECKOUT_REMINDER_GUEST_WHATSAPP_BODY, guestValues)
);
assert.match(guestRendered, /Abdülkadir Kılıç/);
assert.match(guestRendered, /09:00-10:00/);
assert.doesNotMatch(guestRendered, /##/);

const legacyGuest = cleanupAgencyMessageRenderedText(
  renderAgencyMessageTemplate(
    `Çıkış saatimiz (##:##-##:##) da/arasındadır.`,
    guestValues
  )
);
assert.match(legacyGuest, /09:00-10:00/);

const ownerValues = buildCheckInInfoShareTemplateValues({
  ...baseInput,
  audience: "owner",
  recipientName: baseInput.greeterName,
});
const ownerRendered = cleanupAgencyMessageRenderedText(
  renderAgencyMessageTemplate(CHECKOUT_REMINDER_OWNER_WHATSAPP_BODY, ownerValues)
);
assert.match(ownerRendered, /Sayın Mehmet Yılmaz/);
assert.match(ownerRendered, /Abdülkadir Kılıç/);
assert.doesNotMatch(ownerRendered, /##KARŞILAYAN##/);
assert.doesNotMatch(ownerRendered, /\(\s*\)/);

const ownerWithOriginal = buildCheckInInfoShareTemplateValues({
  ...baseInput,
  villaOriginalName: "SİNAN BİTİRİM",
  audience: "owner",
  recipientName: baseInput.greeterName,
});
const ownerOriginalRendered = cleanupAgencyMessageRenderedText(
  renderAgencyMessageTemplate(
    CHECKOUT_REMINDER_OWNER_WHATSAPP_BODY,
    ownerWithOriginal
  )
);
assert.match(ownerOriginalRendered, /\(SİNAN BİTİRİM\)/);

const brokenTemplate = cleanupAgencyMessageRenderedText(
  renderAgencyMessageTemplate(
    `Sayın ##KARŞILAYAN##, Bungalov Masal (##TESİSORJİNALADI##] konaklayan misafirimizin tatili yarın sona erecektir.`,
    ownerValues
  )
);
assert.match(brokenTemplate, /Sayın Mehmet Yılmaz/);
assert.match(brokenTemplate, /Bungalov Masal konaklayan/);
assert.doesNotMatch(brokenTemplate, /##/);
assert.doesNotMatch(brokenTemplate, /\]/);
assert.doesNotMatch(brokenTemplate, /\(\s*\]/);

console.log("smoke-checkout-reminder-placeholders: OK");
