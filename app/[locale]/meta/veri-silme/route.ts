import { buildMetaDataDeletionHtml } from "@/lib/meta-legal-pages";

export const dynamic = "force-dynamic";

export async function GET() {
  const html = await buildMetaDataDeletionHtml();

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
