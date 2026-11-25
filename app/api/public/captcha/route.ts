import { NextResponse } from "next/server";
import { createSimpleCaptchaChallenge } from "@/lib/simple-captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const challenge = createSimpleCaptchaChallenge();
  return NextResponse.json(challenge, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
