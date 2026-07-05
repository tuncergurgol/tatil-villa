import { prisma } from "@/lib/db";
import { getCustomerContactChannelsForPicker } from "@/lib/queries/customer-contact-channels";

const customerSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  contactChannelId: true,
  contactChannel: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function getCustomerListData() {
  const [customers, contactChannels] = await Promise.all([
    prisma.customer.findMany({
      select: customerSelect,
      orderBy: [{ fullName: "asc" }, { createdAt: "desc" }],
    }),
    getCustomerContactChannelsForPicker(),
  ]);

  return { customers, contactChannels };
}

export type CustomerListItem = Awaited<
  ReturnType<typeof getCustomerListData>
>["customers"][number];
