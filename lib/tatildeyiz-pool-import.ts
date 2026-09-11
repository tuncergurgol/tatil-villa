import type { PoolMeasureUnit, PrismaClient } from "@prisma/client";
import {
  fetchTatildeyizPropertyWithDelay,
  type TatildeyizProperty,
  type TatildeyizPropertyPool,
} from "@/lib/tatildeyiz-property";
import {
  poolPurificationOptions,
  poolTypeOptions,
} from "@/lib/villa-pool-options";

export type MappedVillaPool = {
  measureUnit: PoolMeasureUnit;
  width: number | null;
  length: number | null;
  depth: number | null;
  poolType: string;
  purificationMethod: string;
  heated: boolean;
  conservative: boolean;
  sortOrder: number;
};

export type ImportVillaPoolsResult = {
  slug: string;
  villaId?: string;
  dbVillaId?: number | null;
  name?: string;
  status: "success" | "skipped" | "error";
  sourcePoolCount?: number;
  updatedPoolCount?: number;
  createdPoolCount?: number;
  source?: "pools" | "description";
  pools?: MappedVillaPool[];
  error?: string;
};

const KNOWN_POOL_TYPES = new Set<string>(poolTypeOptions);
const KNOWN_PURIFICATIONS = new Set<string>(poolPurificationOptions);

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/´/g, "'")
    .trim();
}

function parseDimensionNumber(raw: string | number | null | undefined) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapPoolMeasureUnit(
  unit: string | null | undefined
): PoolMeasureUnit {
  const normalized = normalizeText(unit ?? "");
  if (normalized === "cm" || normalized.includes("santimetre")) return "CM";
  return "M";
}

export function mapPoolTypeName(name: string | null | undefined) {
  const raw = (name ?? "").trim();
  if (!raw) return "Özel Havuz";

  if (KNOWN_POOL_TYPES.has(raw)) return raw;

  const normalized = normalizeText(raw);
  if (normalized.includes("cocuk")) return "Çocuk Havuzu";
  if (normalized.includes("kapali") || normalized.includes("ic havuz")) {
    return "Kapalı Havuz";
  }
  if (normalized.includes("ortak")) return "Ortak Havuz";
  if (normalized.includes("ozel") || normalized.includes("yuzme")) {
    return "Özel Havuz";
  }

  return raw;
}

export function mapPurificationMethod(name: string | null | undefined) {
  const raw = (name ?? "").trim();
  if (!raw) return "";
  if (KNOWN_PURIFICATIONS.has(raw)) return raw;

  const normalized = normalizeText(raw);
  if (normalized.includes("klor")) return "Klor";
  if (normalized.includes("tuz")) return "Tuz";
  if (normalized.includes("ozon")) return "Ozon";
  if (normalized.includes("dogal")) return "Doğal";
  return raw;
}

function mapPropertyPool(
  pool: TatildeyizPropertyPool,
  sortOrder: number
): MappedVillaPool {
  return {
    measureUnit: mapPoolMeasureUnit(pool.unit),
    width: parseDimensionNumber(pool.width),
    length: parseDimensionNumber(pool.length),
    depth: parseDimensionNumber(pool.height),
    poolType: mapPoolTypeName(pool.poolType?.name),
    purificationMethod: mapPurificationMethod(pool.poolWaterTreatment?.name),
    heated: Boolean(pool.heating),
    conservative: Boolean(pool.conservative_friendly),
    sortOrder,
  };
}

export function mapTatildeyizPropertyPools(
  property: Pick<TatildeyizProperty, "pools">
): MappedVillaPool[] {
  const pools = property.pools ?? [];
  return pools.map((pool, index) => mapPropertyPool(pool, index));
}

/**
 * Açıklama metninden havuz ölçüleri:
 * - "Ebatları: 8mx4m dir. Derinlik:165cm"
 * - "400×800cm Özel Havuz | 150×150cm Çocuk Havuzu"
 * - "Özel yüzme havuzu ... 8m x 4m"
 */
export function parsePoolsFromDescription(
  description: string | null | undefined
): MappedVillaPool[] {
  if (!description?.trim()) return [];

  const plain = description
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sectionMatch =
    plain.match(/Havuz\s*[:,]?\s*([\s\S]{0,400}?)(?=Önemli Bilgiler|Depozito|NOT:|$)/i) ??
    plain.match(
      /(?:Özel\s+)?(?:yüzme\s+)?havuz[uü]?[\s\S]{0,250}?(?:Derinlik[^\d]{0,20}\d+[^\d]{0,10}(?:cm|m)?)/i
    );

  const haystack = sectionMatch?.[0] ?? plain;
  const pools: MappedVillaPool[] = [];

  const dimPattern =
    /(\d+(?:[.,]\d+)?)\s*(cm|m)?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(cm|m)?(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(cm|m)?)?/gi;

  for (const match of haystack.matchAll(dimPattern)) {
    const width = parseDimensionNumber(match[1]);
    const length = parseDimensionNumber(match[3]);
    const depthFromTriple = parseDimensionNumber(match[5]);
    const unitRaw = match[2] || match[4] || match[6] || "";
    let measureUnit = mapPoolMeasureUnit(unitRaw || "m");

    // "8mx4m" → metre; "400x800cm" → cm
    if (!unitRaw) {
      const maxSide = Math.max(width ?? 0, length ?? 0);
      measureUnit = maxSide >= 50 ? "CM" : "M";
    }

    const after = haystack.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 80);
    const before = haystack.slice(Math.max(0, (match.index ?? 0) - 60), match.index ?? 0);
    const context = `${before} ${after}`;
    const poolType = mapPoolTypeName(
      /cocuk/i.test(normalizeText(context))
        ? "Çocuk Havuzu"
        : /kapali|ic havuz/i.test(normalizeText(context))
          ? "Kapalı Havuz"
          : /ortak/i.test(normalizeText(context))
            ? "Ortak Havuz"
            : "Özel Havuz"
    );

    pools.push({
      measureUnit,
      width,
      length,
      depth: depthFromTriple,
      poolType,
      purificationMethod: "",
      heated: /isitmali|ısıtmalı/i.test(context),
      conservative: /muhafazakar|korunakli|korunaklı/i.test(context),
      sortOrder: pools.length,
    });
  }

  // Derinlik ayrı yazılmışsa ilk havuza uygula
  if (pools.length > 0 && pools[0].depth == null) {
    const depthMatch =
      haystack.match(/Derinlik\s*[: ]\s*(\d+(?:[.,]\d+)?)\s*(cm|m)?/i) ??
      haystack.match(/(\d+(?:[.,]\d+)?)\s*(cm|m)\s*derinlik/i);
    if (depthMatch) {
      pools[0].depth = parseDimensionNumber(depthMatch[1]);
      if (depthMatch[2] && pools[0].measureUnit === "M") {
        // depth in cm while pool in m is common; keep depth numeric as given
        // Prefer CM if depth looks like centimetres while sides are metres under ~20
      }
    }
  }

  // "Ebatları: 8mx4m" pattern when width/length order matches screenshot convention
  // Tatildeyiz API uses width×length as 400×800; description often "8mx4m".
  // Keep parsed order as width×length from the text (first×second).

  return pools.filter((pool) => pool.width != null || pool.length != null);
}

export function resolveMappedVillaPools(
  property: Pick<TatildeyizProperty, "pools" | "description">
): {
  pools: MappedVillaPool[];
  source: "pools" | "description" | null;
} {
  const structured = mapTatildeyizPropertyPools(property).filter(
    (pool) =>
      pool.width != null ||
      pool.length != null ||
      pool.depth != null ||
      Boolean(pool.poolType)
  );

  if (structured.length > 0) {
    // Prefer structured even if only type is set (usually also has dims)
    const withDims = structured.filter(
      (pool) => pool.width != null || pool.length != null
    );
    if (withDims.length > 0 || structured.some((p) => p.poolType)) {
      return {
        pools: withDims.length > 0 ? withDims : structured,
        source: "pools",
      };
    }
  }

  const parsed = parsePoolsFromDescription(property.description);
  if (parsed.length > 0) {
    return { pools: parsed, source: "description" };
  }

  return { pools: [], source: null };
}

export function villaPoolsAlreadyDetailed(
  pools: Array<{
    width: number | null;
    length: number | null;
    depth: number | null;
  }>
) {
  return pools.some(
    (pool) => pool.width != null || pool.length != null || pool.depth != null
  );
}

export async function applyTatildeyizPoolsToVilla(
  prisma: PrismaClient,
  slug: string,
  options: {
    dryRun?: boolean;
    force?: boolean;
    property?: TatildeyizProperty;
  } = {}
): Promise<ImportVillaPoolsResult> {
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

  const property =
    options.property ?? (await fetchTatildeyizPropertyWithDelay(slug));
  const { pools: mappedPools, source } = resolveMappedVillaPools(property);

  if (mappedPools.length === 0 || !source) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "error",
      sourcePoolCount: 0,
      error: "Tatildeyiz havuz verisi bulunamadı (pools ve açıklama boş)",
    };
  }

  const existingPools = await prisma.villaPool.findMany({
    where: { villaId: villa.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { periods: true } } },
  });

  if (!force && villaPoolsAlreadyDetailed(existingPools)) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "skipped",
      sourcePoolCount: mappedPools.length,
      source,
      error: "Havuz ölçüleri zaten dolu (--force ile yeniden yazılabilir)",
    };
  }

  const updateCount = Math.min(mappedPools.length, existingPools.length);
  const createCount = Math.max(0, mappedPools.length - existingPools.length);

  if (dryRun) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "success",
      sourcePoolCount: mappedPools.length,
      updatedPoolCount: updateCount,
      createdPoolCount: createCount,
      source,
      pools: mappedPools,
    };
  }

  for (let index = 0; index < updateCount; index += 1) {
    const mapped = mappedPools[index];
    const existing = existingPools[index];
    if (!mapped || !existing) continue;

    await prisma.villaPool.update({
      where: { id: existing.id },
      data: {
        measureUnit: mapped.measureUnit,
        width: mapped.width,
        length: mapped.length,
        depth: mapped.depth,
        poolType: mapped.poolType,
        purificationMethod: mapped.purificationMethod,
        heated: mapped.heated,
        conservative: mapped.conservative,
        sortOrder: mapped.sortOrder,
      },
    });
  }

  for (let index = updateCount; index < mappedPools.length; index += 1) {
    const mapped = mappedPools[index];
    if (!mapped) continue;

    await prisma.villaPool.create({
      data: {
        villaId: villa.id,
        measureUnit: mapped.measureUnit,
        width: mapped.width,
        length: mapped.length,
        depth: mapped.depth,
        poolType: mapped.poolType,
        purificationMethod: mapped.purificationMethod,
        heated: mapped.heated,
        conservative: mapped.conservative,
        sortOrder: mapped.sortOrder,
      },
    });
  }

  if (force && existingPools.length > mappedPools.length) {
    const extras = existingPools.slice(mappedPools.length);
    const removable = extras
      .filter((pool) => pool._count.periods === 0)
      .map((pool) => pool.id);
    if (removable.length > 0) {
      await prisma.villaPool.deleteMany({
        where: { id: { in: removable } },
      });
    }
  }

  return {
    slug,
    villaId: villa.id,
    dbVillaId: villa.villaId,
    name: villa.name,
    status: "success",
    sourcePoolCount: mappedPools.length,
    updatedPoolCount: updateCount,
    createdPoolCount: createCount,
    source,
    pools: mappedPools,
  };
}
