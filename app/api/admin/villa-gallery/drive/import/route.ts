import { NextResponse } from "next/server";
import { requireVillaEditor } from "@/lib/auth-helpers";
import { importDriveGalleryFileBatch } from "@/lib/villa-gallery-drive-import.server";

export const maxDuration = 300;

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return parsed;
}

export async function POST(request: Request) {
  let body: {
    villaId?: string;
    fileIds?: string[];
    startSequence?: number;
    deferPersist?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "İstek okunamadı" }, { status: 400 });
  }

  const villaId = body.villaId?.trim() ?? "";
  if (!villaId) {
    return NextResponse.json({ error: "Villa kimliği gerekli" }, { status: 400 });
  }

  try {
    await requireVillaEditor(villaId);
  } catch {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const fileIds = Array.isArray(body.fileIds)
    ? body.fileIds.filter((id): id is string => typeof id === "string")
    : [];

  const result = await importDriveGalleryFileBatch(villaId, fileIds, {
    startSequence: parsePositiveInt(body.startSequence),
    persist: body.deferPersist !== true,
  });

  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
