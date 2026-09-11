import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import { isLikelyPaymentMethodLabel } from "../lib/booking-guest-contact";
import { parseBookingDetails } from "../lib/booking-form-details";
import { syncAllCustomersFromBookings } from "../lib/customer-from-booking";

async function main() {
  const bookings = await prisma.booking.findMany({
    select: {
      id: true,
      guestPhone: true,
      guestEmail: true,
      details: true,
    },
  });

  let fixed = 0;

  for (const booking of bookings) {
    const details = parseBookingDetails(booking.details);
    const nextDetails = { ...details };
    let nextPhone = booking.guestPhone;
    let nextEmail = booking.guestEmail;
    let changed = false;

    if (isLikelyPaymentMethodLabel(booking.guestPhone)) {
      nextDetails.importPaymentMethod = booking.guestPhone.trim();
      nextPhone = "";
      changed = true;
    }

    if (nextEmail.toLowerCase().endsWith("@tatildeyiz.local")) {
      nextEmail = "";
      changed = true;
    }

    if (!changed) continue;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        guestPhone: nextPhone,
        guestEmail: nextEmail,
        details: nextDetails as Prisma.InputJsonValue,
      },
    });
    fixed += 1;
  }

  const sync = await syncAllCustomersFromBookings();

  console.log("Rezervasyon telefon alanı düzeltildi:", fixed);
  console.log("Müşteri senkronu:", sync);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
