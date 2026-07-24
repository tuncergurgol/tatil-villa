import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadVillaGalleryFiles } from "@/lib/villa-gallery-upload.server";

export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Form verisi okunamadı" },
      { status: 400 }
    );
  }

  const villaId = String(formData.get("villaId") ?? "").trim();
  if (!villaId) {
    return NextResponse.json({ error: "Villa kimliği gerekli" }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  const result = await uploadVillaGalleryFiles(villaId, files);
  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
