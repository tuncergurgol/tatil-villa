"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { resolveVillaDocumentType, UNDOCUMENTED_VILLA_VISIBILITY } from "@/lib/villa-document-types";
import { verifyKonutBelgeOnline } from "@/lib/konut-belge-check";

export type VillaDocumentActionState = {
  success?: boolean;
  error?: string;
  documentNo?: string;
};

const documentSchema = z.object({
  documentType: z.enum([
    "KONUT_BELGESI",
    "TURIZM_ISLETME_BELGESI",
    "KISMI_TURIZM_ISLETME_BELGESI",
    "TURIZM_YATIRIMI_BELGESI",
    "BASIT_KONAKLAMA",
    "PLAJ_ISLETMESI",
  ]),
  documentOwnerName: z.string().min(1, "Belge sahibi adı gerekli"),
  documentAddress: z.string().min(1, "Ev adresi gerekli"),
  documentRoomCapacity: z.coerce.number().int().min(0),
  documentBedCapacity: z.coerce.number().int().min(0),
  documentImageUrl: z.string(),
  documentNo: z.string().optional(),
});

function parseDocumentFormData(formData: FormData) {
  return {
    documentType: String(formData.get("documentType") ?? "").trim(),
    documentOwnerName: String(formData.get("documentOwnerName") ?? "").trim(),
    documentAddress: String(formData.get("documentAddress") ?? "").trim(),
    documentRoomCapacity: String(formData.get("documentRoomCapacity") ?? "").trim(),
    documentBedCapacity: String(formData.get("documentBedCapacity") ?? "").trim(),
    documentImageUrl: String(formData.get("documentImageUrl") ?? "").trim(),
    documentNo: String(formData.get("documentNo") ?? "").trim(),
  };
}

function isEmptyDocumentForm(input: ReturnType<typeof parseDocumentFormData>) {
  return (
    !input.documentType &&
    !input.documentNo &&
    !input.documentOwnerName &&
    !input.documentAddress &&
    !input.documentImageUrl &&
    !input.documentRoomCapacity &&
    !input.documentBedCapacity
  );
}

function revalidateVillaDocumentPaths() {
  revalidatePath("/admin/villalar");
}

export async function getVillaDocumentData(villaId: string) {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      name: true,
      location: true,
      bedrooms: true,
      guests: true,
      documentNo: true,
      documentType: true,
      documentOwnerName: true,
      documentAddress: true,
      documentRoomCapacity: true,
      documentBedCapacity: true,
      documentImageUrl: true,
      owner: {
        select: { name: true },
      },
    },
  });

  if (!villa) return null;

  const resolvedDocumentType = resolveVillaDocumentType(
    villa.documentNo,
    villa.documentType
  );

  return {
    ...villa,
    documentType: resolvedDocumentType,
    documentOwnerName: villa.documentOwnerName || villa.owner?.name || "",
    documentAddress: villa.documentAddress || villa.location,
    documentRoomCapacity: villa.documentRoomCapacity ?? villa.bedrooms,
    documentBedCapacity: villa.documentBedCapacity ?? villa.guests,
  };
}

export async function saveVillaDocument(
  _prev: VillaDocumentActionState,
  formData: FormData
): Promise<VillaDocumentActionState> {
  await requireAdmin();

  const villaId = formData.get("villaId") as string;
  if (!villaId) return { error: "Villa bulunamadı" };

  const raw = parseDocumentFormData(formData);

  if (isEmptyDocumentForm(raw)) {
    try {
      await prisma.villa.update({
        where: { id: villaId },
        data: {
          documentType: null,
          documentOwnerName: "",
          documentAddress: "",
          documentRoomCapacity: null,
          documentBedCapacity: null,
          documentImageUrl: "",
          documentNo: "",
          ...UNDOCUMENTED_VILLA_VISIBILITY,
        },
      });
      revalidateVillaDocumentPaths();
      return { success: true, documentNo: "" };
    } catch {
      return { error: "Belge kaydedilemedi" };
    }
  }

  const parsed = documentSchema.safeParse({
    documentType: raw.documentType || undefined,
    documentOwnerName: raw.documentOwnerName,
    documentAddress: raw.documentAddress,
    documentRoomCapacity: raw.documentRoomCapacity || "0",
    documentBedCapacity: raw.documentBedCapacity || "0",
    documentImageUrl: raw.documentImageUrl,
    documentNo: raw.documentNo || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const existing = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { documentNo: true, documentType: true },
  });
  if (!existing) return { error: "Villa bulunamadı" };

  const documentNo =
    parsed.data.documentNo?.trim() ||
    existing.documentNo ||
    (parsed.data.documentType
      ? `48-${Math.floor(10000 + Math.random() * 89999)}`
      : "");

  const documentType = resolveVillaDocumentType(
    documentNo,
    parsed.data.documentType
  );

  if (!documentType) {
    return { error: "Belge türü seçilmelidir" };
  }

  const hadDocumentBefore = Boolean(
    resolveVillaDocumentType(existing.documentNo, existing.documentType) ||
      existing.documentNo.trim()
  );
  const applyShowInSearch =
    formData.get("applyShowInSearch") === "true" && !hadDocumentBefore;
  const showInSearch = formData.get("showInSearch") === "true";

  try {
    await prisma.villa.update({
      where: { id: villaId },
      data: {
        documentType,
        documentOwnerName: parsed.data.documentOwnerName.trim(),
        documentAddress: parsed.data.documentAddress.trim(),
        documentRoomCapacity: parsed.data.documentRoomCapacity,
        documentBedCapacity: parsed.data.documentBedCapacity,
        documentImageUrl: parsed.data.documentImageUrl.trim(),
        documentNo,
        ...(applyShowInSearch ? { showInSearch } : {}),
      },
    });
    revalidateVillaDocumentPaths();
    return { success: true, documentNo };
  } catch {
    return { error: "Belge kaydedilemedi" };
  }
}

export async function verifyVillaKonutBelge(documentNo: string) {
  await requireAdmin();
  return verifyKonutBelgeOnline(documentNo);
}

export async function clearVillaDocument(
  villaId: string
): Promise<VillaDocumentActionState> {
  await requireAdmin();

  try {
    await prisma.villa.update({
      where: { id: villaId },
      data: {
        documentType: null,
        documentOwnerName: "",
        documentAddress: "",
        documentRoomCapacity: null,
        documentBedCapacity: null,
        documentImageUrl: "",
        documentNo: "",
        ...UNDOCUMENTED_VILLA_VISIBILITY,
      },
    });
    revalidateVillaDocumentPaths();
    return { success: true };
  } catch {
    return { error: "Belge temizlenemedi" };
  }
}
