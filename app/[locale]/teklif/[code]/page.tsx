import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";

export const dynamic = "force-dynamic";

export default async function PublicVillaShareRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const share = await prisma.publicVillaShareLink.findUnique({
    where: { code },
    select: {
      villaIds: true,
      checkIn: true,
      checkOut: true,
      adults: true,
    },
  });

  if (!share) notFound();

  const query = new URLSearchParams();
  query.set("ids", share.villaIds.join(","));
  query.set("checkIn", share.checkIn);
  query.set("checkOut", share.checkOut);
  query.set("adults", String(share.adults));
  const domain = sanitizePublicBookingDomain("www.tatildeyiz.com.tr");

  redirect(`https://${domain}/villalar?${query.toString()}`);
}
