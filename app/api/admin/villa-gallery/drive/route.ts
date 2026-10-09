import { NextResponse } from "next/server";
import { requireVillaEditor } from "@/lib/auth-helpers";
import { listDriveGalleryForVilla } from "@/lib/villa-gallery-drive-import.server";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { villaId?: string; driveUrl?: string };
  try {
    body = (await request.json()) as { villaId?: string; driveUrl?: string };
  } catch {
    return NextResponse.json({ error: "İstek okunamadı" }, { status: 400 });
  }

  const villaId = body.villaId?.trim() ?? "";
  const driveUrl = body.driveUrl?.trim() ?? "";
  if (!villaId) {
    return NextResponse.json({ error: "Villa kimliği gerekli" }, { status: 400 });
  }
  if (!driveUrl) {
    return NextResponse.json(
      { error: "Google Drive bağlantısı gerekli" },
      { status: 400 }
    );
  }

  try {
    await requireVillaEditor(villaId);
  } catch {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const listed = await listDriveGalleryForVilla(driveUrl);
    return NextResponse.json({
      files: listed.files.map((file) => ({ id: file.id, name: file.name })),
      warnings: listed.warnings,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Google Drive klasörü okunamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
