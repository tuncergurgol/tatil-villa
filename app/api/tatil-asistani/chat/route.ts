import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Tatil Asistanı şu an kullanılamıyor" },
    { status: 503 }
  );
}
