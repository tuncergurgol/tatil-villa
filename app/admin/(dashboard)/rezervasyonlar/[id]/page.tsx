import { notFound } from "next/navigation";
import AdminBookingDetailPageClient from "@/components/admin/bookings/AdminBookingDetailPageClient";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminBookingDetailPage({ params }: Props) {
  const { id } = await params;
  if (!id?.trim()) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!booking) notFound();

  return <AdminBookingDetailPageClient bookingId={booking.id} />;
}
