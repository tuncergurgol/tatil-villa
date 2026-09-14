"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { RegionTreeNode } from "@/lib/regions-tree";

function filterRegionTree(
  nodes: RegionTreeNode[],
  query: string
): RegionTreeNode[] {
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  if (!normalized) return nodes;

  function filterNode(node: RegionTreeNode): RegionTreeNode | null {
    const nameMatch = node.name.toLocaleLowerCase("tr-TR").includes(normalized);
    const filteredChildren = node.children
      .map(filterNode)
      .filter((item): item is RegionTreeNode => item !== null);

    if (nameMatch) return { ...node, children: node.children };
    if (filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  return nodes
    .map(filterNode)
    .filter((item): item is RegionTreeNode => item !== null);
}

function collectTreeIds(nodes: RegionTreeNode[]): string[] {
  const ids: string[] = [];
  function walk(items: RegionTreeNode[]) {
    for (const item of items) {
      ids.push(item.id);
      walk(item.children);
    }
  }
  walk(nodes);
  return ids;
}

function RegionTreeRow({
  node,
  depth,
  expanded,
  selectedSlugs,
  onToggleExpand,
  onToggleSelect,
}: {
  node: RegionTreeNode;
  depth: number;
  expanded: Set<string>;
  selectedSlugs: string[];
  onToggleExpand: (id: string) => void;
  onToggleSelect: (slug: string, checked: boolean) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedSlugs.includes(node.slug);

  return (
    <>
      <div
        className="flex items-center gap-1.5 py-1 pr-2 hover:bg-gray-50"
        style={{ paddingLeft: `${6 + depth * 14}px` }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(event) => onToggleSelect(node.slug, event.target.checked)}
          className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
          aria-label={`${node.name} seç`}
        />
        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 ${
            hasChildren ? "hover:bg-gray-100 hover:text-gray-600" : "invisible"
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <span className="truncate text-xs text-gray-800">{node.name}</span>
      </div>
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <RegionTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            selectedSlugs={selectedSlugs}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
          />
        ))}
    </>
  );
}

interface RegionTreePanelProps {
  tree: RegionTreeNode[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
}

export default function RegionTreePanel({
  tree,
  selectedSlugs,
  onChange,
}: RegionTreePanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredTree = useMemo(
    () => filterRegionTree(tree, search),
    [tree, search]
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(collectTreeIds(tree))
  );

  const visibleExpanded = useMemo(() => {
    if (!search.trim()) return expanded;
    return new Set(collectTreeIds(filteredTree));
  }, [expanded, filteredTree, search]);

  const summary = useMemo(() => {
    if (selectedSlugs.length === 0) return "Seçilmedi";
    if (selectedSlugs.length === 1) return "1 seçili";
    return `${selectedSlugs.length} seçili`;
  }, [selectedSlugs.length]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(slug: string, checked: boolean) {
    if (checked) onChange([...selectedSlugs, slug]);
    else onChange(selectedSlugs.filter((item) => item !== slug));
  }

  return (
    <details
      className="group relative"
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex h-9 cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none transition hover:border-gray-300 focus:ring-2 focus:ring-sky-100">
        <span className={selectedSlugs.length > 0 ? "font-semibold text-sky-700" : ""}>
          {selectedSlugs.length > 0 ? summary : "Bölge seçin..."}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:min-w-72">
        <div className="flex items-center gap-1.5 border-b border-gray-100 p-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Bölge ara..."
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          {selectedSlugs.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="shrink-0 px-1 text-[11px] font-medium text-sky-600 hover:text-sky-700"
            >
              Temizle
            </button>
          ) : null}
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filteredTree.length > 0 ? (
            filteredTree.map((node) => (
              <RegionTreeRow
                key={node.id}
                node={node}
                depth={0}
                expanded={visibleExpanded}
                selectedSlugs={selectedSlugs}
                onToggleExpand={toggleExpanded}
                onToggleSelect={toggleSelect}
              />
            ))
          ) : (
            <p className="px-3 py-4 text-center text-xs text-gray-400">
              {search.trim() ? "Eşleşen bölge yok." : "Bölge bulunamadı."}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end border-t border-gray-100 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </details>
  );
}
