/**
 * Konut belge link kuralları smoke testi.
 *
 *   npx tsx scripts/smoke-konut-belge-link.ts
 */
import {
  inferKonutBelgesiType,
  isKonutBelgeLinkable,
  resolveVillaDocumentType,
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

  console.log("smoke-konut-belge-link: OK");
}

main();
