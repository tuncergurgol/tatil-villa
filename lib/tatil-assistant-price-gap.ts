import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getRegionIdsForFilter } from "@/lib/queries/region-tree";
import { getStayNightKeys } from "@/lib/stay-quote";
import { assistantMissingPriceMessage } from "@/lib/tatil-assistant-format";
import type { AssistantSearchState } from "@/lib/tatil-assistant-types";

type RegionTrail = NonNullable<AssistantSearchState["regionTrail"]>;

async function trailFromDatabase(slug: string): Promise<RegionTrail> {
  const regions = await prisma.region.findMany({
    where: { active: true },
    select: { id: true, parentId: true, level: true, name: true, slug: true },
  });
  const trail: RegionTrail = {};
  const seen = new Set<string>();
  let current = regions.find((region) => region.slug === slug);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const place = { name: current.name, slug: current.slug };
    if (current.level === "IL") trail.il = place;
    else if (current.level === "ILCE") trail.ilce = place;
    else trail.mahalle = place;
    current = current.parentId
      ? regions.find((region) => region.id === current?.parentId)
      : undefined;
  }
  return trail;
}

function placeLabel(trail: RegionTrail | undefined, fallback: string) {
  const parts = [trail?.il?.name, trail?.ilce?.name, trail?.mahalle?.name].filter(Boolean);
  return parts.join(", ") || fallback;
}
import { dbDateToDateKey } from "@/lib/villa-period-calendar";

export const ASSISTANT_PRICE_GAP_EMAIL = "info@tatildeyiz.com.tr";

function trailLine(state: AssistantSearchState) {
  const trail = state.regionTrail;
  return [
    trail?.il ? `İl: ${trail.il.name}` : "",
    trail?.ilce ? `İlçe: ${trail.ilce.name}` : "",
    trail?.mahalle ? `Mahalle: ${trail.mahalle.name}` : "",
  ].filter(Boolean);
}

async function notifyMissingPrices(
  state: AssistantSearchState,
  place: string,
  villaNames: string[]
) {
  const party = [
    state.adults ? `${state.adults} yetişkin` : "",
    state.children ? `${state.children} çocuk` : "",
    state.babies ? `${state.babies} bebek` : "",
  ].filter(Boolean);
  const lines = [
    "Misafir bir bölge için tarih sordu. Bölgede aktif villa var, seçilen tarihte fiyat bilgisi yok.",
    "",
    `Yer: ${place}`,
    ...trailLine(state),
    `Giriş: ${state.checkIn ?? "—"}`,
    `Çıkış: ${state.checkOut ?? "—"}`,
    `Kişi: ${party.join(", ") || "—"}`,
    `Özellikler: ${(state.amenityNames ?? []).join(", ") || "—"}`,
    `Misafir: ${state.guestName || "—"}`,
    `Telefon: ${state.guestPhone || "—"}`,
    "",
    "Aktif villalar:",
    ...villaNames.slice(0, 40).map((name) => `- ${name}`),
  ];
  const text = lines.join("\n");
  try {
    const company = await getCompanySettings();
    await sendCompanyMail(company, {
      to: ASSISTANT_PRICE_GAP_EMAIL,
      bcc: "",
      subject: `Fiyat eksik — ${place} — ${state.checkIn ?? ""} / ${state.checkOut ?? ""}`,
      text,
      html: toHtmlFromText(text),
    });
  } catch (error) {
    console.error("[assistant-price-gap] e-posta", error);
  }
}

/** Bölgede aktif villa var, seçilen gecelerin fiyatı yoksa misafir cümlesini döndürür. */
export async function missingRegionPriceReply(state: AssistantSearchState) {
  if (state.regionAny || !state.regionSlugs?.length || !state.checkIn || !state.checkOut) {
    return "";
  }
  const nights = getStayNightKeys(state.checkIn, state.checkOut);
  if (nights.length === 0) return "";

  const regionIds = new Set<string>();
  for (const slug of state.regionSlugs) {
    const ids = await getRegionIdsForFilter(slug);
    ids?.forEach((id) => regionIds.add(id));
  }
  if (regionIds.size === 0) return "";

  const villas = await prisma.villa.findMany({
    where: { active: true, regionId: { in: [...regionIds] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (villas.length === 0) return "";

  const days = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: { in: villas.map((villa) => villa.id) },
      date: {
        gte: new Date(`${state.checkIn}T00:00:00.000Z`),
        lt: new Date(`${state.checkOut}T00:00:00.000Z`),
      },
      nightlyPrice: { gt: 0 },
    },
    select: { villaId: true, date: true },
  });
  const nightSet = new Set(nights);
  const covered = new Map<string, Set<string>>();
  for (const day of days) {
    const key = dbDateToDateKey(new Date(day.date));
    if (!nightSet.has(key)) continue;
    const set = covered.get(day.villaId) ?? new Set<string>();
    set.add(key);
    covered.set(day.villaId, set);
  }
  if (villas.some((villa) => covered.get(villa.id)?.size === nights.length)) return "";

  const trail =
    state.regionTrail?.il || state.regionTrail?.ilce || state.regionTrail?.mahalle
      ? state.regionTrail
      : await trailFromDatabase(state.regionSlugs[0] ?? "");
  const region = await prisma.region.findFirst({
    where: { slug: state.regionSlugs[0] },
    select: { name: true },
  });
  const place = placeLabel(trail, region?.name || "Bu bölge");
  await notifyMissingPrices(
    { ...state, regionTrail: trail },
    place,
    villas.map((villa) => villa.name)
  );
  return assistantMissingPriceMessage(place);
}
