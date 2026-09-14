import { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/db";
import {
  assignConfirmedBookingCustomerTags,
  syncCustomerFromBookingGuest,
} from "../lib/customer-crm";

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      guestPhone: { not: "" },
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      checkIn: true,
      createdAt: true,
      customerId: true,
    },
  });

  let customersCreated = 0;
  let customersUpdated = 0;
  let bookingsLinked = 0;
  let tagsAssigned = 0;

  for (const booking of bookings) {
    const result = await syncCustomerFromBookingGuest({
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      firstContactAt: booking.createdAt,
      assignConfirmedTags: true,
      checkIn: booking.checkIn,
    });

    if (!result) continue;

    if (result.created) customersCreated += 1;
    else customersUpdated += 1;

    if (booking.customerId !== result.id) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { customerId: result.id },
      });
      bookingsLinked += 1;
    }

    await assignConfirmedBookingCustomerTags({
      customerId: result.id,
      checkIn: booking.checkIn,
    });
    tagsAssigned += 1;
  }

  const callbackRequests = await prisma.callbackRequest.findMany({
    where: { phone: { not: "" } },
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      phone: true,
      createdAt: true,
      verifiedAt: true,
    },
  });

  const { syncCustomerFromCallback } = await import("../lib/customer-crm");
  let callbacksSynced = 0;
  for (const item of callbackRequests) {
    const result = await syncCustomerFromCallback({
      name: item.name,
      phone: item.phone,
      firstContactAt: item.verifiedAt ?? item.createdAt,
    });
    if (result) callbacksSynced += 1;
  }

  const facebookLeads = await prisma.facebookLead.findMany({
    where: {
      phone: { not: "" },
      isTest: false,
    },
    orderBy: { createdAt: "asc" },
    select: {
      fullName: true,
      phone: true,
      email: true,
      createdAt: true,
    },
  });

  const { syncCustomerFromFacebookLead } = await import("../lib/customer-crm");
  let facebookSynced = 0;
  for (const lead of facebookLeads) {
    const result = await syncCustomerFromFacebookLead({
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      firstContactAt: lead.createdAt,
    });
    if (result) facebookSynced += 1;
  }

  console.log("CRM müşteri migrasyonu tamamlandı.");
  console.log(`  ONAYLANDI rezervasyon: ${bookings.length}`);
  console.log(`  Yeni müşteri: ${customersCreated}`);
  console.log(`  Güncellenen müşteri: ${customersUpdated}`);
  console.log(`  Rezervasyon bağlantısı: ${bookingsLinked}`);
  console.log(`  Etiket atanan rezervasyon: ${tagsAssigned}`);
  console.log(`  Sizi Arayalım senkron: ${callbacksSynced}`);
  console.log(`  Facebook Lead senkron: ${facebookSynced}`);
  console.log(`  Toplam müşteri: ${await prisma.customer.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
