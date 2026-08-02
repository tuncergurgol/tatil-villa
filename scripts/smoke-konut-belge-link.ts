/**
 * Konut belge link kuralları smoke testi.
 *
 *   npx tsx scripts/smoke-konut-belge-link.ts
 */
import { isKonutBelgeLinkable } from "../lib/villa-document-types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  assert(
    isKonutBelgeLinkable({
      documentType: "KONUT_BELGESI",
      documentNo: "48-9434",
    }),
    "explicit konut belgesi should link"
  );

  assert(
    isKonutBelgeLinkable({
      documentType: null,
      documentNo: "48-9434",
    }),
    "legacy konut number without type should link"
  );

  for (const documentType of [
    "TURIZM_ISLETME_BELGESI",
    "KISMI_TURIZM_ISLETME_BELGESI",
    "TURIZM_YATIRIMI_BELGESI",
    "BASIT_KONAKLAMA",
    "PLAJ_ISLETMESI",
  ] as const) {
    assert(
      !isKonutBelgeLinkable({
        documentType,
        documentNo: "48-9434",
      }),
      `${documentType} should not link`
    );
  }

  console.log("smoke-konut-belge-link: OK");
}

main();
