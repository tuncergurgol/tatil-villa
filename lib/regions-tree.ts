export interface RegionFlat {
  id: string;
  slug: string;
  name: string;
  image: string;
  description: string;
  longDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  parentId: string | null;
  active: boolean;
  published: boolean;
  showInSearch: boolean;
  showInOffer: boolean;
  showOnHome: boolean;
  sortOrder: number;
  villaCount: number;
}

export interface RegionTreeNode extends RegionFlat {
  children: RegionTreeNode[];
}

export function buildRegionTree(regions: RegionFlat[]): RegionTreeNode[] {
  const map = new Map<string, RegionTreeNode>();

  for (const region of regions) {
    map.set(region.id, { ...region, children: [] });
  }

  const roots: RegionTreeNode[] = [];

  for (const region of regions) {
    const node = map.get(region.id)!;
    if (region.parentId && map.has(region.parentId)) {
      map.get(region.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: RegionTreeNode[]) => {
    nodes.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

export function flattenRegionTree(nodes: RegionTreeNode[]): RegionFlat[] {
  const result: RegionFlat[] = [];

  const walk = (items: RegionTreeNode[]) => {
    for (const item of items) {
      const { children, ...flat } = item;
      result.push(flat);
      walk(children);
    }
  };

  walk(nodes);
  return result;
}

export function collectRegionIds(nodes: RegionTreeNode[]): string[] {
  return flattenRegionTree(nodes).map((r) => r.id);
}
