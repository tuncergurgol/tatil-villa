import { PrismaClient, VillaPeriodCurrency } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

type ImportTour = {
  sourceId: number;
  slug: string;
  title: string;
  shortDesc: string;
  overview: string;
  explain: string;
  durationHours: string;
  groupSize: string;
  location: string;
  tag: string;
  price: number | null;
  currency: string;
  priority: number;
  onList: boolean;
  hasTransfer: boolean;
  freeCancelationHours: string;
  images: { url: string; alt: string; isMain: boolean; sortOrder: number }[];
  includes: string[];
  highlights: string[];
  excludes: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalPath?: string;
};

function brandify(text: string): string {
  return text
    .replace(/villabavulu\.com/gi, "tatildeyiz.com.tr")
    .replace(/Villa\s*Bavulu/gi, "Tatildeyiz")
    .replace(/villabavulu/gi, "tatildeyiz")
    .replace(/\bBavulu\b/gi, "Tatildeyiz");
}

function toCurrency(value: string): VillaPeriodCurrency {
  const v = (value || "TL").toUpperCase();
  if (v === "EUR" || v === "USD" || v === "GBP" || v === "TL") return v;
  return "TL";
}

function buildSeo(tour: ImportTour) {
  const titleBase = brandify(tour.seoTitle || tour.title);
  const seoTitle = titleBase.includes("Tatildeyiz")
    ? titleBase
    : `${titleBase} | Tatildeyiz`;
  const seoDescription = brandify(
    tour.seoDescription ||
      tour.shortDesc ||
      tour.overview ||
      `${tour.title} — Tatildeyiz ile günübirlik tur ve aktivite deneyimi.`
  );
  const seoKeywords = brandify(
    tour.seoKeywords ||
      [tour.title, tour.location, "günübirlik tur", "Tatildeyiz", "Fethiye tur"]
        .filter(Boolean)
        .join(", ")
  );
  const canonicalPath = `/tur/${tour.slug}`;
  return { seoTitle, seoDescription, seoKeywords, canonicalPath };
}

async function main() {
  const file = path.join(process.cwd(), "prisma", "tour-import-data.json");
  const tours = JSON.parse(readFileSync(file, "utf8")) as ImportTour[];

  let upserted = 0;
  for (const [index, tour] of tours.entries()) {
    const sortedImages = [...tour.images].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
    const main =
      sortedImages.find((img) => img.isMain) || sortedImages[0] || null;
    const seo = buildSeo(tour);
    const currency = toCurrency(tour.currency);

    const data = {
      sourceId: tour.sourceId,
      slug: tour.slug,
      title: tour.title,
      shortDesc: tour.shortDesc || "",
      overview: tour.overview || "",
      descriptionHtml: tour.explain || "",
      location: tour.location || "",
      durationHours: tour.durationHours || "",
      groupSize: tour.groupSize || "",
      tag: tour.tag || "",
      priceFrom: tour.price,
      currency,
      hasTransfer: tour.hasTransfer,
      freeCancelationHours: tour.freeCancelationHours || "",
      includesJson: JSON.stringify(tour.includes || []),
      highlightsJson: JSON.stringify(tour.highlights || []),
      excludesJson: JSON.stringify(tour.excludes || []),
      coverImage: main?.url || "",
      ...seo,
      sortOrder: tour.priority ?? index,
      isActive: true,
      onList: tour.onList !== false,
    };

    const existing = await prisma.tour.findUnique({
      where: { slug: tour.slug },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.tour.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.tour.create({ data });

    await prisma.tourImage.deleteMany({ where: { tourId: saved.id } });
    if (sortedImages.length > 0) {
      await prisma.tourImage.createMany({
        data: sortedImages.map((img, i) => ({
          tourId: saved.id,
          url: img.url,
          alt: img.alt || tour.title,
          isMain: main ? img.url === main.url : i === 0,
          sortOrder: img.sortOrder ?? i,
        })),
      });
    }
    upserted += 1;
    console.log(`[${upserted}/${tours.length}] ${tour.slug}`);
  }

  console.log(`Import tamam: ${upserted} tur`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
