import { NextResponse } from "next/server";
import { Yolcu360ApiError } from "@/lib/yolcu360/client";

export function yolcu360JsonError(error: unknown, fallback = "İşlem başarısız") {
  if (error instanceof Yolcu360ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.status }
    );
  }
  console.error("[yolcu360]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function parseJsonBody<T>(request: Request) {
  return (await request.json()) as T;
}
