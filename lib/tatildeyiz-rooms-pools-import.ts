import type { PrismaClient } from "@prisma/client";
import {
  applyTatildeyizPoolsToVilla,
  type ImportVillaPoolsResult,
  type MappedVillaPool,
} from "@/lib/tatildeyiz-pool-import";
import {
  applyTatildeyizRoomsToVilla,
  type ImportVillaRoomsResult,
  type MappedVillaRoom,
} from "@/lib/tatildeyiz-room-import";
import {
  fetchTatildeyizPropertyWithDelay,
  type TatildeyizProperty,
} from "@/lib/tatildeyiz-property";

export type ImportVillaRoomsPoolsResult = {
  slug: string;
  villaId?: string;
  dbVillaId?: number | null;
  name?: string;
  status: "success" | "skipped" | "error";
  roomsStatus?: ImportVillaRoomsResult["status"];
  poolsStatus?: ImportVillaPoolsResult["status"];
  roomsSource?: ImportVillaRoomsResult["source"];
  poolsSource?: ImportVillaPoolsResult["source"];
  sourceRoomCount?: number;
  updatedRoomCount?: number;
  sourcePoolCount?: number;
  updatedPoolCount?: number;
  createdPoolCount?: number;
  rooms?: MappedVillaRoom[];
  pools?: MappedVillaPool[];
  error?: string;
};

function mergeStatus(
  rooms: ImportVillaRoomsResult,
  pools: ImportVillaPoolsResult
): ImportVillaRoomsPoolsResult["status"] {
  if (rooms.status === "success" || pools.status === "success") {
    return "success";
  }
  if (rooms.status === "skipped" && pools.status === "skipped") {
    return "skipped";
  }
  if (rooms.status === "skipped" && pools.status === "error") {
    // Oda zaten dolu, havuz bulunamadı → skipped (kısmi dolu villa)
    return "skipped";
  }
  if (rooms.status === "error" && pools.status === "skipped") {
    return "skipped";
  }
  if (rooms.status === "error" && pools.status === "error") {
    return "error";
  }
  // one error + one success already handled; remaining edge: error+skipped above
  return "error";
}

export async function applyTatildeyizRoomsAndPoolsToVilla(
  prisma: PrismaClient,
  slug: string,
  options: {
    dryRun?: boolean;
    force?: boolean;
    property?: TatildeyizProperty;
  } = {}
): Promise<ImportVillaRoomsPoolsResult> {
  const { dryRun = false, force = false } = options;

  const villa = await prisma.villa.findUnique({
    where: { slug },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
    },
  });

  if (!villa) {
    return { slug, status: "error", error: "Villa veritabanında bulunamadı" };
  }

  let property = options.property;
  try {
    property = property ?? (await fetchTatildeyizPropertyWithDelay(slug));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tatildeyiz sayfası alınamadı";
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "error",
      error: message,
    };
  }

  const rooms = await applyTatildeyizRoomsToVilla(prisma, slug, {
    dryRun,
    force,
    property,
  });

  const pools = await applyTatildeyizPoolsToVilla(prisma, slug, {
    dryRun,
    force,
    property,
  });

  const status = mergeStatus(rooms, pools);
  const errors = [rooms.error, pools.error].filter(Boolean);

  return {
    slug,
    villaId: villa.id,
    dbVillaId: villa.villaId,
    name: villa.name,
    status,
    roomsStatus: rooms.status,
    poolsStatus: pools.status,
    roomsSource: rooms.source,
    poolsSource: pools.source,
    sourceRoomCount: rooms.sourceRoomCount,
    updatedRoomCount: rooms.updatedRoomCount,
    sourcePoolCount: pools.sourcePoolCount,
    updatedPoolCount: pools.updatedPoolCount,
    createdPoolCount: pools.createdPoolCount,
    rooms: rooms.rooms,
    pools: pools.pools,
    error:
      status === "error"
        ? errors.join(" | ") || "Oda/havuz içe aktarılamadı"
        : status === "skipped"
          ? errors.join(" | ") || undefined
          : undefined,
  };
}
