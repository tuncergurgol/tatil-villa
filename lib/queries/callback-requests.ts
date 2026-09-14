import { prisma } from "@/lib/db";

import type { CallbackRequestStatus } from "@prisma/client";



export type CallbackRequestItem = Awaited<

  ReturnType<typeof getAllCallbackRequests>

>[number];



/** Admin listesi: OTP doğrulanmamış PENDING kayıtları gizlenir */

export async function getAllCallbackRequests() {

  return prisma.callbackRequest.findMany({

    where: { status: { not: "PENDING" } },

    orderBy: { createdAt: "desc" },

  });

}



export async function getCallbackRequestById(id: string) {

  return prisma.callbackRequest.findUnique({ where: { id } });

}



export async function getCallbackRequestCounts() {

  const [total, verified, neu, contacted, closed] = await Promise.all([

    prisma.callbackRequest.count({ where: { status: { not: "PENDING" } } }),

    prisma.callbackRequest.count({ where: { status: "VERIFIED" } }),

    prisma.callbackRequest.count({ where: { status: "NEW" } }),

    prisma.callbackRequest.count({ where: { status: "CONTACTED" } }),

    prisma.callbackRequest.count({ where: { status: "CLOSED" } }),

  ]);



  return { total, verified, neu, contacted, closed };

}



export async function getCallbackRequestsByStatus(

  status?: CallbackRequestStatus

) {

  return prisma.callbackRequest.findMany({

    where: status

      ? { status }

      : { status: { not: "PENDING" } },

    orderBy: { createdAt: "desc" },

  });

}


