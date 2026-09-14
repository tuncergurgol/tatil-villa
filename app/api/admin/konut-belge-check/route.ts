import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { verifyKonutBelgeOnline } from "@/lib/konut-belge-check";
import { getKonutBelgeCheckRowsByIds } from "@/lib/queries/konut-belge-check";

const MAX_BATCH_SIZE = 8;

const postSchema = z.object({
  villaIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const rows = await getKonutBelgeCheckRowsByIds([]);
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const villaIds = parsed.data.villaIds ?? [];
  if (villaIds.length === 0) {
    return NextResponse.json(
      { error: "Kontrol edilecek kayıt bulunamadı" },
      { status: 400 }
    );
  }

  if (villaIds.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Tek seferde en fazla ${MAX_BATCH_SIZE} kayıt kontrol edilebilir` },
      { status: 400 }
    );
  }

  const targetRows = await getKonutBelgeCheckRowsByIds(villaIds);
  const results = [];
  for (const row of targetRows) {
    const verification = await verifyKonutBelgeOnline(row.documentNo);
    results.push({
      villaId: row.villaId,
      villaName: row.villaName,
      slug: row.slug,
      documentNo: row.documentNo,
      documentOwnerName: row.documentOwnerName,
      checkUrl: verification.checkUrl,
      status: verification.status,
      checkedAt: verification.checkedAt,
      errorMessage: verification.errorMessage,
    });
  }

  return NextResponse.json({
    results,
    processed: results.length,
  });
}
