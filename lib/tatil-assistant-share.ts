import { randomBytes } from "crypto";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";
import { prisma } from "@/lib/db";

export async function createAssistantPublicShareLink(input: {
  villaIds: string[];
  checkIn: string;
  checkOut: string;
  adults: number;
  domain?: string | null;
}): Promise<string | null> {
  const villaIds = [...new Set(input.villaIds.filter(Boolean))];
  if (!villaIds.length) return null;

  const existingVillaCount = await prisma.villa.count({
    where: { id: { in: villaIds }, active: true },
  });
  if (existingVillaCount === 0) return null;

  const activeIds = (
    await prisma.villa.findMany({
      where: { id: { in: villaIds }, active: true },
      select: { id: true },
      orderBy: { id: "asc" },
    })
  ).map((v) => v.id);

  const share = await prisma.publicVillaShareLink.create({
    data: {
      code: randomBytes(6).toString("hex"),
      villaIds: activeIds,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
    },
    select: { code: true },
  });

  const domain = sanitizePublicBookingDomain(
    input.domain ?? "www.tatildeyiz.com.tr"
  );
  return `https://${domain}/teklif/${share.code}`;
}
