import { randomUUID } from "crypto";
import { getMernisIlceByCode } from "@/lib/mernis-ilce";
import { getOwnerDisplayName } from "@/lib/btrans-report";
import type {
  InvoiceReportBookingInput,
  InvoiceReportCompanyInput,
  InvoiceReportGuestInput,
  InvoiceReportOwnerInput,
} from "@/lib/edm-invoice-export";
import { escapeXml } from "@/lib/edm/xml";
import type { EdmConfig } from "@/lib/edm/config";

const VAT_RATE = 20;
const VAT_DIVISOR = 1.2;
const LINE_NAME = "ACENTE HİZMET BEDELİ";

export type EdmUblBuildResult = {
  uuid: string;
  xml: string;
  profileId: "EARSIVFATURA" | "TEMELFATURA";
  eArchive: boolean;
  receiverVkn: string;
  receiverTitle: string;
  net: number;
  vat: number;
  gross: number;
};

function money(n: number): string {
  return n.toFixed(2);
}

function isoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeTax(value: string): string {
  return value.replace(/\D/g, "");
}

function schemeForTax(taxNo: string): "VKN" | "TCKN" {
  return taxNo.length === 11 ? "TCKN" : "VKN";
}

function resolveCountryCode(country: string): string {
  const n = country.trim().toLocaleLowerCase("tr");
  if (n === "türkiye" || n === "turkiye" || n === "turkey" || n === "tr") {
    return "TR";
  }
  return "TR";
}

function ownerDisplay(owner: NonNullable<InvoiceReportOwnerInput>) {
  return getOwnerDisplayName({
    type: owner.type,
    name: owner.name,
    firstName: owner.firstName,
    lastName: owner.lastName,
    companyTitle: owner.companyTitle,
    tcKimlikNo: owner.tcKimlikNo,
    taxNumber: owner.taxNumber,
    bankIban: "",
    phone: "",
    email: "",
  });
}

function resolveOwnerTax(owner: NonNullable<InvoiceReportOwnerInput>) {
  return owner.type === "TUZEL_KISI"
    ? normalizeTax(owner.taxNumber)
    : normalizeTax(owner.tcKimlikNo);
}

function resolveOwnerRegion(owner: NonNullable<InvoiceReportOwnerInput>) {
  const mernis = getMernisIlceByCode(owner.mernisIlceCode);
  return {
    city: (mernis?.ilAdi || "").toLocaleUpperCase("tr"),
    district: (mernis?.ilceAdi || "").toLocaleUpperCase("tr"),
  };
}

export type EdmSupplierParty = {
  taxNumber: string;
  title: string;
  taxOffice: string;
  address: string;
  city: string;
  district: string;
  country: string;
  mersisNo?: string;
  tradeRegistryNo?: string;
};

export type EdmCustomerParty = {
  taxNumber: string;
  title: string;
  taxOffice: string;
  address: string;
  city: string;
  district: string;
  country: string;
};

function partyXml(
  role: "AccountingSupplierParty" | "AccountingCustomerParty",
  party: EdmSupplierParty | EdmCustomerParty,
  extras?: { mersisNo?: string; tradeRegistryNo?: string }
) {
  const scheme = schemeForTax(party.taxNumber);
  const countryCode = resolveCountryCode(party.country);
  const countryName = party.country.trim() || "Türkiye";
  const extraIds =
    role === "AccountingSupplierParty"
      ? [
          extras?.mersisNo
            ? `<cac:PartyIdentification><cbc:ID schemeID="MERSISNO">${escapeXml(extras.mersisNo)}</cbc:ID></cac:PartyIdentification>`
            : "",
          extras?.tradeRegistryNo
            ? `<cac:PartyIdentification><cbc:ID schemeID="TICARETSICILNO">${escapeXml(extras.tradeRegistryNo)}</cbc:ID></cac:PartyIdentification>`
            : "",
        ].join("")
      : "";

  const personXml =
    scheme === "TCKN"
      ? (() => {
          const parts = party.title.trim().split(/\s+/);
          const first = parts[0] || party.title;
          const last = parts.slice(1).join(" ") || party.title;
          return `<cac:Person><cbc:FirstName>${escapeXml(first)}</cbc:FirstName><cbc:FamilyName>${escapeXml(last)}</cbc:FamilyName></cac:Person>`;
        })()
      : "";

  return `<cac:${role}>
  <cac:Party>
    <cac:PartyIdentification>
      <cbc:ID schemeID="${scheme}">${escapeXml(party.taxNumber)}</cbc:ID>
    </cac:PartyIdentification>
    ${extraIds}
    <cac:PartyName>
      <cbc:Name>${escapeXml(party.title)}</cbc:Name>
    </cac:PartyName>
    <cac:PostalAddress>
      <cbc:StreetName>${escapeXml(party.address)}</cbc:StreetName>
      <cbc:CitySubdivisionName>${escapeXml(party.district)}</cbc:CitySubdivisionName>
      <cbc:CityName>${escapeXml(party.city)}</cbc:CityName>
      <cac:Country>
        <cbc:IdentificationCode>${escapeXml(countryCode)}</cbc:IdentificationCode>
        <cbc:Name>${escapeXml(countryName)}</cbc:Name>
      </cac:Country>
    </cac:PostalAddress>
    <cac:PartyTaxScheme>
      <cac:TaxScheme>
        <cbc:Name>${escapeXml(party.taxOffice || "-")}</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
    ${personXml}
  </cac:Party>
</cac:${role}>`;
}

export function resolveEdmCustomerFromBooking(
  booking: InvoiceReportBookingInput
): EdmCustomerParty {
  const recipientKind = booking.recipientKind ?? "owner";
  if (recipientKind === "guest") {
    const guest = booking.guest as NonNullable<InvoiceReportGuestInput>;
    return {
      taxNumber: normalizeTax(guest.taxNumber),
      title: guest.title.trim(),
      taxOffice: "-",
      address: guest.address.trim(),
      city: guest.city.trim().toLocaleUpperCase("tr"),
      district: guest.district.trim().toLocaleUpperCase("tr"),
      country: guest.country.trim() || "Türkiye",
    };
  }

  const owner = booking.owner as NonNullable<InvoiceReportOwnerInput>;
  const region = resolveOwnerRegion(owner);
  return {
    taxNumber: resolveOwnerTax(owner),
    title: ownerDisplay(owner),
    taxOffice: "-",
    address: owner.address.trim(),
    city: region.city,
    district: region.district,
    country: owner.country.trim() || "Türkiye",
  };
}

export function buildCommissionUblInvoice(input: {
  booking: InvoiceReportBookingInput;
  company: InvoiceReportCompanyInput & {
    title: string;
    taxOffice: string;
    address: string;
    mersisNo?: string;
    tradeRegistryNo?: string;
  };
  config: Pick<EdmConfig, "supplierCity" | "supplierDistrict">;
  eArchive: boolean;
  uuid?: string;
}): EdmUblBuildResult {
  const uuid = input.uuid || randomUUID();
  const invoiceDate = input.booking.invoiceDate ?? input.booking.checkIn;
  const gross = Math.round(input.booking.commissionAmount);
  const net = Math.round(gross / VAT_DIVISOR);
  const vat = gross - net;
  const profileId = input.eArchive ? "EARSIVFATURA" : "TEMELFATURA";
  const reservationCode =
    input.booking.externalCode || input.booking.bookingId;
  const note = `${reservationCode} - ${input.booking.guestName.trim()} - ${input.booking.villa.name.trim()} - ${isoDate(input.booking.checkIn)} / ${isoDate(input.booking.checkOut)}`;

  const supplier: EdmSupplierParty = {
    taxNumber: normalizeTax(input.company.taxNumber),
    title: input.company.title,
    taxOffice: input.company.taxOffice,
    address: input.company.address,
    city: input.config.supplierCity,
    district: input.config.supplierDistrict,
    country: "Türkiye",
    mersisNo: input.company.mersisNo,
    tradeRegistryNo: input.company.tradeRegistryNo,
  };
  const customer = resolveEdmCustomerFromBooking(input.booking);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ID></cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${escapeXml(uuid)}</cbc:UUID>
  <cbc:IssueDate>${isoDate(invoiceDate)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(note)}</cbc:Note>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
  ${partyXml("AccountingSupplierParty", supplier, {
    mersisNo: supplier.mersisNo,
    tradeRegistryNo: supplier.tradeRegistryNo,
  })}
  ${partyXml("AccountingCustomerParty", customer)}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${money(vat)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="TRY">${money(net)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="TRY">${money(vat)}</cbc:TaxAmount>
      <cbc:CalculationSequenceNumeric>1</cbc:CalculationSequenceNumeric>
      <cbc:Percent>${VAT_RATE}</cbc:Percent>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:Name>KDV</cbc:Name>
          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${money(net)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${money(net)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${money(gross)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="TRY">0.00</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="TRY">${money(gross)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">${money(net)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="TRY">${money(vat)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="TRY">${money(net)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="TRY">${money(vat)}</cbc:TaxAmount>
        <cbc:CalculationSequenceNumeric>1</cbc:CalculationSequenceNumeric>
        <cbc:Percent>${VAT_RATE}</cbc:Percent>
        <cac:TaxCategory>
          <cac:TaxScheme>
            <cbc:Name>KDV</cbc:Name>
            <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${escapeXml(LINE_NAME)}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="TRY">${money(net)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

  return {
    uuid,
    xml,
    profileId,
    eArchive: input.eArchive,
    receiverVkn: customer.taxNumber,
    receiverTitle: customer.title,
    net,
    vat,
    gross,
  };
}
