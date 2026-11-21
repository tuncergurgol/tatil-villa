import type { TourismDocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildKonutBelgeCheckUrl,
  type KonutBelgeCheckStatus,
} from "@/lib/konut-belge-check";
import { isKonutBelgeLinkable } from "@/lib/villa-document-types";

export type KonutBelgeCheckRow = {
  villaId: string;
  villaName: string;
  slug: string;
  documentNo: string;
  documentOwnerName: string;
  checkUrl: string;
  status: KonutBelgeCheckStatus;
  checkedAt: string | null;
  errorMessage?: string;
};

function isKonutBelgesiVilla(villa: {
  documentType: TourismDocumentType | null;
  documentNo: string;
}) {
  return isKonutBelgeLinkable(villa);
}

export async function getKonutBelgeCheckRows() {
  const villas = await prisma.villa.findMany({
    where: {
      documentNo: { not: "" },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      documentNo: true,
      documentType: true,
      documentOwnerName: true,
    },
    orderBy: [{ name: "asc" }],
  });

  const rows: KonutBelgeCheckRow[] = villas
    .filter(isKonutBelgesiVilla)
    .map((villa) => {
      const documentNo = villa.documentNo.trim();
      return {
        villaId: villa.id,
        villaName: villa.name,
        slug: villa.slug,
        documentNo,
        documentOwnerName: villa.documentOwnerName.trim() || "-",
        checkUrl: buildKonutBelgeCheckUrl(documentNo),
        status: "PENDING" as const,
        checkedAt: null,
      };
    });

  return rows;
}

export async function getKonutBelgeCheckRowsByIds(villaIds: string[]) {
  const allRows = await getKonutBelgeCheckRows();
  if (villaIds.length === 0) return allRows;
  const idSet = new Set(villaIds);
  return allRows.filter((row) => idSet.has(row.villaId));
}
