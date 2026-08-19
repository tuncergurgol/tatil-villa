/**
 * Konut belge link kuralları smoke testi.
 *
 *   npx tsx scripts/smoke-konut-belge-link.ts
 */
import {
  hasVillaTourismDocument,
  inferKonutBelgesiType,
  isKonutBelgeLinkable,
  resolveVillaDocumentType,
  UNDOCUMENTED_VILLA_VISIBILITY,
} from "../lib/villa-document-types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  for (const prefix of ["07-", "35-", "48-", "54-"]) {
    const documentNo = `${prefix}1234`;
    assert(
      inferKonutBelgesiType(documentNo) === "KONUT_BELGESI",
      `${prefix} should infer konut belgesi`
    );
    assert(
      resolveVillaDocumentType(documentNo, null) === "KONUT_BELGESI",
      `${prefix} should resolve to konut belgesi when type empty`
    );
    assert(
      resolveVillaDocumentType(documentNo, "TURIZM_ISLETME_BELGESI") ===
        "KONUT_BELGESI",
      `${prefix} should override non-konut type`
    );
    assert(
      isKonutBelgeLinkable({ documentType: null, documentNo }),
      `${prefix} legacy number should link`
    );
    assert(
      isKonutBelgeLinkable({
        documentType: "TURIZM_ISLETME_BELGESI",
        documentNo,
      }),
      `${prefix} with wrong type should still link via prefix`
    );
  }

  assert(
    isKonutBelgeLinkable({
      documentType: "KONUT_BELGESI",
      documentNo: "48-9434",
    }),
    "explicit konut belgesi should link"
  );

  assert(
    !isKonutBelgeLinkable({
      documentType: "TURIZM_ISLETME_BELGESI",
      documentNo: "12-9999",
    }),
    "non-konut prefix should not link"
  );

  assert(
    !hasVillaTourismDocument({ documentType: null, documentNo: "  " }),
    "whitespace-only document no should be undocumented"
  );
  assert(
    hasVillaTourismDocument({
      documentType: "TURIZM_ISLETME_BELGESI",
      documentNo: "",
    }),
    "document type without number should still count as documented"
  );
  assert(
    UNDOCUMENTED_VILLA_VISIBILITY.active === true &&
      UNDOCUMENTED_VILLA_VISIBILITY.showInSearch === false &&
      UNDOCUMENTED_VILLA_VISIBILITY.showInOffer === true,
    "undocumented villas stay active, hidden from search, visible in offer"
  );

  console.log("smoke-konut-belge-link: OK");
}

main();
