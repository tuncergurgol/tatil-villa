import { prisma } from "@/lib/db";
import { getCustomerContactChannelsForPicker } from "@/lib/queries/customer-contact-channels";
import {
  getConfirmedStayCountByCustomerId,
  resolveCustomerLoyaltyTier,
  resolveCustomerStayCount,
} from "@/lib/customer-loyalty";

const customerSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  firstContactAt: true,
  contactChannelId: true,
  contactChannel: {
    select: {
      id: true,
      name: true,
    },
  },
  tags: {
    select: {
      assignedAt: true,
      tag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  },
  memberAccount: {
    select: {
      id: true,
      loyaltyTier: true,
      inviteCode: true,
      completedStays: true,
      couponBalance: true,
    },
  },
} as const;

export async function getCustomerListData() {
  const [customers, contactChannels, stayByCustomer] = await Promise.all([
    prisma.customer.findMany({
      select: customerSelect,
      orderBy: [{ fullName: "asc" }, { createdAt: "desc" }],
    }),
    getCustomerContactChannelsForPicker(),
    getConfirmedStayCountByCustomerId(),
  ]);

  const enriched = customers.map((customer) => {
    const stayCount = resolveCustomerStayCount({
      bookingCount: stayByCustomer.get(customer.id) ?? 0,
      tags: customer.tags.map((entry) => entry.tag),
    });
    const loyaltyTier = resolveCustomerLoyaltyTier(stayCount);

    return {
      ...customer,
      stayCount,
      loyaltyTier,
    };
  });

  return { customers: enriched, contactChannels };
}

export type CustomerListItem = Awaited<
  ReturnType<typeof getCustomerListData>
>["customers"][number];
