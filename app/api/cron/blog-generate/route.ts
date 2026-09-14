import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runScheduledBlogAiGeneration } from "@/lib/blog-ai-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function readCronSecret(request: Request) {
  return (
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("secret")
  );
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET tanımlı değil" },
      { status: 503 }
    );
  }

  const provided = readCronSecret(request);
  if (provided !== expected) {
    return NextResponse.json({ ok: false, message: "Yetkisiz" }, { status: 401 });
  }

  const result = await runScheduledBlogAiGeneration();
  if (result.ok) {
    revalidatePath("/blog");
    revalidatePath("/admin/icerik");
  }

  return NextResponse.json({
    ok: result.ok,
    message: result.message,
    topicId: result.topicId,
    blogPostId: result.blogPostId,
    slug: result.slug,
    source: result.source,
  });
}
