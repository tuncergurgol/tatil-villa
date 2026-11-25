"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Search } from "lucide-react";
import { RegionLevel } from "@/lib/region-levels";
import type { RegionTreeNode } from "@/lib/regions-tree";

interface VillaRegionTreeFilterProps {
  tree: RegionTreeNode[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
}

function compareRegionNames(a: string, b: string) {
  return a.localeCompare(b, "tr", { sensitivity: "base" });
}

function sortRegionTreeForPicker(nodes: RegionTreeNode[]): RegionTreeNode[] {
  return [...nodes]
    .sort((a, b) => {
      const aIsProvince = a.level === RegionLevel.IL ? 0 : 1;
      const bIsProvince = b.level === RegionLevel.IL ? 0 : 1;
      if (aIsProvince !== bIsProvince) return aIsProvince - bIsProvince;
      return compareRegionNames(a.name, b.name);
    })
    .map((node) => ({
      ...node,
      children: sortRegionTreeForPicker(node.children),
    }));
}

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

function collectExpandableIds(nodes: RegionTreeNode[]): string[] {
  const ids: string[] = [];

  function walk(items: RegionTreeNode[]) {
    for (const item of items) {
      if (item.children.length > 0) ids.push(item.id);
      walk(item.children);
    }
  }

  walk(nodes);
  return ids;
}

function RegionTreeFilterRow({
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
        className="flex items-center gap-2 py-1.5 pr-2 hover:bg-gray-50"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(event) => onToggleSelect(node.slug, event.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
          aria-label={`${node.name} seç`}
        />

        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 ${
            hasChildren ? "hover:bg-gray-100 hover:text-gray-600" : "invisible"
          }`}
          aria-label={isExpanded ? "Daralt" : "Genişlet"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-800">{node.name}</p>
        </div>
      </div>

      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <RegionTreeFilterRow
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

export default function VillaRegionTreeFilter({
  tree,
  selectedSlugs,
  onChange,
}: VillaRegionTreeFilterProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const sortedTree = useMemo(() => sortRegionTreeForPicker(tree), [tree]);
  const filteredTree = useMemo(
    () => filterRegionTree(sortedTree, search),
    [sortedTree, search]
  );
  const searching = search.trim().length > 0;
  const wasSearching = useRef(false);
  const expandableIds = useMemo(
    () => collectExpandableIds(searching ? filteredTree : sortedTree),
    [filteredTree, searching, sortedTree]
  );
  const allOpen =
    expandableIds.length > 0 &&
    expandableIds.every((id) => expanded.has(id));

  useEffect(() => {
    if (!searching) {
      if (wasSearching.current) setExpanded(new Set());
      wasSearching.current = false;
      return;
    }
    wasSearching.current = true;
    setExpanded(new Set(collectExpandableIds(filteredTree)));
  }, [filteredTree, searching]);

  const label = useMemo(() => {
    if (selectedSlugs.length === 0) return "Bölge";
    if (selectedSlugs.length === 1) return "1 bölge";
    return `${selectedSlugs.length} bölge`;
  }, [selectedSlugs.length]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setExpanded(allOpen ? new Set() : new Set(expandableIds));
  }

  function toggleSelect(slug: string, checked: boolean) {
    if (checked) {
      onChange(selectedSlugs.includes(slug) ? selectedSlugs : [...selectedSlugs, slug]);
      return;
    }

    onChange(selectedSlugs.filter((item) => item !== slug));
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex min-w-[120px] items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-sky-100 ${
          selectedSlugs.length > 0
            ? "border-sky-300 bg-sky-50 text-sky-800"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          {label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bölge Seç
            </p>
            {expandableIds.length > 0 ? (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-sky-700 hover:text-sky-800"
              >
                {allOpen ? "TÜMÜNÜ KAPAT" : "TÜMÜNÜ AÇ"}
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="İl, ilçe veya mahalle ara"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
            {selectedSlugs.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="shrink-0 text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                Temizle
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {filteredTree.length > 0 ? (
              filteredTree.map((node) => (
                <RegionTreeFilterRow
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  selectedSlugs={selectedSlugs}
                  onToggleExpand={toggleExpanded}
                  onToggleSelect={toggleSelect}
                />
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                {searching ? "Eşleşen bölge yok." : "Bölge bulunamadı."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
