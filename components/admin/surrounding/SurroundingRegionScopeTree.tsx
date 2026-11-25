"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { RegionLevel, REGION_LEVEL_LABELS } from "@/lib/region-levels";
import {
  buildSurroundingRegionTree,
  compressRegionScopeSelection,
  expandRegionScopeSelection,
  getRegionScopeCheckState,
  indexSurroundingRegionTree,
  toggleRegionScopeCascade,
  type SurroundingRegionFlat,
  type SurroundingRegionNode,
} from "@/lib/surrounding-location-helpers";

interface SurroundingRegionScopeTreeProps {
  regions: SurroundingRegionFlat[];
  selectedRegionIds: string[];
  onChange: (regionIds: string[]) => void;
}

function ScopeRow({
  node,
  depth,
  expanded,
  selected,
  byId,
  onToggleExpand,
  onToggleSelect,
}: {
  node: SurroundingRegionNode;
  depth: number;
  expanded: Set<string>;
  selected: Set<string>;
  byId: Map<string, SurroundingRegionNode>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const checkState = getRegionScopeCheckState(node.id, selected, byId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = checkState === "indeterminate";
    }
  }, [checkState]);

  const levelLabel =
    REGION_LEVEL_LABELS[node.level as keyof typeof REGION_LEVEL_LABELS] ??
    node.level;

  return (
    <>
      <div
        className="flex items-center gap-2 py-1.5 pr-2 hover:bg-gray-50"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <input
          ref={inputRef}
          type="checkbox"
          checked={checkState === "checked"}
          onChange={(event) =>
            onToggleSelect(node.id, event.target.checked)
          }
          className="h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
          <p className="truncate text-sm font-medium text-gray-800">
            {node.name}
            <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-gray-400">
              {levelLabel}
            </span>
          </p>
        </div>
      </div>

      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <ScopeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            selected={selected}
            byId={byId}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
          />
        ))}
    </>
  );
}

export default function SurroundingRegionScopeTree({
  regions,
  selectedRegionIds,
  onChange,
}: SurroundingRegionScopeTreeProps) {
  const tree = useMemo(
    () => buildSurroundingRegionTree(regions),
    [regions]
  );
  const { byId, childrenByParent, parentById } = useMemo(
    () => indexSurroundingRegionTree(tree),
    [tree]
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        tree
          .filter((node) => node.level === RegionLevel.IL)
          .map((node) => node.id)
      )
  );
  const [filter, setFilter] = useState("");

  const selected = useMemo(
    () => expandRegionScopeSelection(selectedRegionIds, byId),
    [selectedRegionIds, byId]
  );

  const filteredTree = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("tr");
    if (!q) return tree;

    function filterNode(
      node: SurroundingRegionNode
    ): SurroundingRegionNode | null {
      const childMatches = node.children
        .map(filterNode)
        .filter(Boolean) as SurroundingRegionNode[];
      const selfMatch = node.name.toLocaleLowerCase("tr").includes(q);
      if (!selfMatch && childMatches.length === 0) return null;
      return { ...node, children: childMatches };
    }

    return tree
      .map(filterNode)
      .filter(Boolean) as SurroundingRegionNode[];
  }, [tree, filter]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string, checked: boolean) {
    const next = toggleRegionScopeCascade(
      id,
      checked,
      selected,
      byId,
      parentById,
      childrenByParent
    );
    onChange(compressRegionScopeSelection(next, tree));
  }

  const compressedCount = selectedRegionIds.length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-gray-500">
            Listeleneceği bölgeler
          </span>
          <p className="mt-0.5 text-xs text-gray-400">
            İl seçince altındaki ilçe ve mahalleler otomatik işaretlenir. Hiç
            seçilmezse tüm bölgelerde görünür.
          </p>
        </div>
        {compressedCount > 0 ? (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
            {compressedCount} kapsam
          </span>
        ) : null}
      </div>

      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Bölge ara (il / ilçe / mahalle)..."
        className="mb-2 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />

      <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 py-1">
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => (
            <ScopeRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              selected={selected}
              byId={byId}
              onToggleExpand={toggleExpanded}
              onToggleSelect={toggleSelect}
            />
          ))
        ) : (
          <p className="px-3 py-6 text-center text-sm text-gray-400">
            Bölge bulunamadı.
          </p>
        )}
      </div>
    </div>
  );
}
