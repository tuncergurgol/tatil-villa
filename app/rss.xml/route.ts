import { NextResponse } from "next/server";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { getPublishedBlogPosts } from "@/lib/queries/cms-content";
import { canonicalOriginFromDomain } from "@/lib/search-discovery";

export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const origin = canonicalOriginFromDomain(site.domain);
  const posts = await getPublishedBlogPosts({ limit: 50 });

  const items = posts
    .map((post) => {
      const link = `${origin}/blog/${post.slug}`;
      const date = (post.publishedAt ?? post.updatedAt).toUTCString();
      return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid>${xmlEscape(link)}</guid>
      <pubDate>${date}</pubDate>
      <description>${xmlEscape(post.excerpt || post.seoDescription || "")}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(site.brandName)}</title>
    <link>${xmlEscape(origin)}</link>
    <description>${xmlEscape(site.seoDescription)}</description>
    <language>tr</language>
${items}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
}
