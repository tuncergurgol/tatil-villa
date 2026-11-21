import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildBiletallInquirySummary,
  notifyBiletallInquiryLead,
  serializeBiletallQuery,
} from "@/lib/biletall-inquiry";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { getCompanySettings } from "@/lib/queries/company-settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: Record<string, string>;
    };
    const query = body.query ?? {};
    const rawQuery = serializeBiletallQuery(query);
    if (!rawQuery.trim()) {
      return NextResponse.json({ error: "Boş sorgu" }, { status: 400 });
    }

    const duplicate = await prisma.biletallInquiry.findFirst({
      where: {
        rawQuery,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true, id: duplicate.id });
    }

    const company = await getCompanySettings();
    const site = await getPublicSiteProfile(company);
    const { pnr, summary } = buildBiletallInquirySummary(query);

    const row = await prisma.biletallInquiry.create({
      data: {
        sourceSite: site.brandName,
        sourceDomain: site.domain,
        pnr,
        summary,
        rawQuery,
      },
    });

    await notifyBiletallInquiryLead({
      pnr,
      summary,
      sourceSite: row.sourceSite,
      sourceDomain: row.sourceDomain,
    });

    await prisma.biletallInquiry.update({
      where: { id: row.id },
      data: { staffNotifiedAt: new Date() },
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    console.error("[obilet-inquiry]", error);
    return NextResponse.json({ error: "Kayıt oluşturulamadı" }, { status: 500 });
  }
}
