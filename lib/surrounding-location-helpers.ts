import { RegionLevel } from "@/lib/region-levels";

export type SurroundingRegionScope = {
  id: string;
  name: string;
  level: string;
};

/** Villa bölgesinin il (ve varsa ilçe) id'lerini çıkarır. */
export function collectVillaRegionAncestorIds(
  regions: Array<{ id: string; level: string; parentId: string | null }>,
  villaRegionId: string | null | undefined
): string[] {
  if (!villaRegionId) return [];
  const byId = new Map(regions.map((region) => [region.id, region]));
  const ids: string[] = [];
  let current = byId.get(villaRegionId);
  while (current) {
    ids.push(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return ids;
}

/**
 * Konum bu villa bölgesinde listelenir mi?
 * regionScopes boşsa tüm bölgelerde geçerlidir.
 * Doluysa villa'nın il/ilçe/mahalle zincirinden biri eşleşmeli.
 */
export function surroundingLocationMatchesRegion(
  scopeRegionIds: string[],
  villaAncestorIds: string[]
): boolean {
  if (scopeRegionIds.length === 0) return true;
  if (villaAncestorIds.length === 0) return false;
  const villaSet = new Set(villaAncestorIds);
  return scopeRegionIds.some((id) => villaSet.has(id));
}

export function parseLatLngPaste(raw: string): {
  latitude: number;
  longitude: number;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/
  );
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

export function isValidLatLng(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }
  if (latitude === 0 && longitude === 0) return false;
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function filterIlRegions<
  T extends { level: string; name: string },
>(regions: T[]): T[] {
  return regions
    .filter((region) => region.level === RegionLevel.IL)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export type SurroundingRegionNode = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  children: SurroundingRegionNode[];
};

export type SurroundingRegionFlat = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
};

function compareRegionName(
  a: { name: string },
  b: { name: string }
): number {
  return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
}

export function buildSurroundingRegionTree(
  regions: SurroundingRegionFlat[]
): SurroundingRegionNode[] {
  const map = new Map<string, SurroundingRegionNode>();
  for (const region of regions) {
    map.set(region.id, { ...region, children: [] });
  }

  const roots: SurroundingRegionNode[] = [];
  for (const region of regions) {
    const node = map.get(region.id)!;
    if (region.parentId && map.has(region.parentId)) {
      map.get(region.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: SurroundingRegionNode[]) => {
    nodes.sort(compareRegionName);
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);
  return roots;
}

export function collectDescendantIds(
  node: SurroundingRegionNode,
  includeSelf = true
): string[] {
  const ids: string[] = includeSelf ? [node.id] : [];
  for (const child of node.children) {
    ids.push(...collectDescendantIds(child, true));
  }
  return ids;
}

export function indexSurroundingRegionTree(tree: SurroundingRegionNode[]) {
  const byId = new Map<string, SurroundingRegionNode>();
  const childrenByParent = new Map<string, string[]>();
  const parentById = new Map<string, string | null>();

  function walk(nodes: SurroundingRegionNode[]) {
    for (const node of nodes) {
      byId.set(node.id, node);
      parentById.set(node.id, node.parentId);
      childrenByParent.set(
        node.id,
        node.children.map((child) => child.id)
      );
      walk(node.children);
    }
  }
  walk(tree);

  return { byId, childrenByParent, parentById };
}

/** Kayıttaki üst bölge id'lerini UI için alt kırılımlarla genişletir. */
export function expandRegionScopeSelection(
  storedIds: string[],
  byId: Map<string, SurroundingRegionNode>
): Set<string> {
  const selected = new Set<string>();
  for (const id of storedIds) {
    const node = byId.get(id);
    if (!node) {
      selected.add(id);
      continue;
    }
    for (const descendantId of collectDescendantIds(node, true)) {
      selected.add(descendantId);
    }
  }
  return selected;
}

/** Tam seçili alt ağaçları tek üst id'ye sıkıştırır (DB şişmesin). */
export function compressRegionScopeSelection(
  selected: Set<string>,
  tree: SurroundingRegionNode[]
): string[] {
  const result: string[] = [];

  function isCompleteSubtree(node: SurroundingRegionNode): boolean {
    if (!selected.has(node.id)) return false;
    return node.children.every((child) => isCompleteSubtree(child));
  }

  function emit(node: SurroundingRegionNode) {
    if (isCompleteSubtree(node)) {
      result.push(node.id);
      return;
    }
    for (const child of node.children) emit(child);
  }

  for (const root of tree) emit(root);
  return result;
}

export function toggleRegionScopeCascade(
  regionId: string,
  checked: boolean,
  selected: Set<string>,
  byId: Map<string, SurroundingRegionNode>,
  parentById: Map<string, string | null>,
  childrenByParent: Map<string, string[]>
): Set<string> {
  const next = new Set(selected);
  const node = byId.get(regionId);
  const affected = node
    ? collectDescendantIds(node, true)
    : [regionId];

  if (checked) {
    for (const id of affected) next.add(id);

    let parentId = parentById.get(regionId) ?? null;
    while (parentId) {
      const siblings = childrenByParent.get(parentId) ?? [];
      if (siblings.every((siblingId) => next.has(siblingId))) {
        next.add(parentId);
        parentId = parentById.get(parentId) ?? null;
      } else {
        break;
      }
    }
  } else {
    for (const id of affected) next.delete(id);

    let parentId = parentById.get(regionId) ?? null;
    while (parentId) {
      next.delete(parentId);
      parentId = parentById.get(parentId) ?? null;
    }
  }

  return next;
}

export function getRegionScopeCheckState(
  regionId: string,
  selected: Set<string>,
  byId: Map<string, SurroundingRegionNode>
): "checked" | "unchecked" | "indeterminate" {
  if (selected.has(regionId)) return "checked";
  const node = byId.get(regionId);
  if (!node || node.children.length === 0) return "unchecked";
  const descendants = collectDescendantIds(node, false);
  if (descendants.some((id) => selected.has(id))) return "indeterminate";
  return "unchecked";
}
