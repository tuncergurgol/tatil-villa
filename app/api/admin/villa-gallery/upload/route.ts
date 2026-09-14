import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadVillaGalleryFiles } from "@/lib/villa-gallery-upload.server";

export const maxDuration = 300;

function parsePositiveInt(value: FormDataEntryValue | null) {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return parsed;
}

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

  const deferPersist = formData.get("deferPersist") === "true";
  const skipRevalidate = formData.get("skipRevalidate") === "true";
  const startSequence = parsePositiveInt(formData.get("startSequence"));

  const result = await uploadVillaGalleryFiles(villaId, files, {
    persist: !deferPersist,
    revalidate: !skipRevalidate && !deferPersist,
    startSequence,
  });
  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
