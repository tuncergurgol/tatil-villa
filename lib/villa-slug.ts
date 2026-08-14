import { prisma } from "@/lib/db";
import { slugifyTurkish } from "@/lib/tatildeyiz-next-data";

/** "Villa Vadi 7 Kopyası" → "Villa Vadi 7" */
export function stripVillaCopyLabelFromName(name: string): string {
  return name.replace(/\s+kopyas[iı](\s*\(\d+\))?$/i, "").trim();
}

/** Villa adından URL slug üretir (kopya etiketi hariç). */
export function buildVillaSlugFromName(name: string): string {
  const normalized = stripVillaCopyLabelFromName(name.trim());
  return slugifyTurkish(normalized) || "villa";
}

export function isLegacyKopyasiSlug(slug: string): boolean {
  return /(^|-)kopyas[iı]?($|-|\d)/i.test(slug) || slug.includes("-kopya");
}

export async function ensureUniqueVillaSlug(
  preferredSlug: string,
  excludeVillaId?: string
): Promise<string> {
  const base = preferredSlug.trim() || "villa";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.villa.findFirst({
      where: {
        slug: candidate,
        ...(excludeVillaId ? { NOT: { id: excludeVillaId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function resolveVillaSlugForName(
  name: string,
  excludeVillaId?: string
): Promise<string> {
  return ensureUniqueVillaSlug(buildVillaSlugFromName(name), excludeVillaId);
}
