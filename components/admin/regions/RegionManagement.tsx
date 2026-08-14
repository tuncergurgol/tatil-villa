"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe2,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { deleteRegion } from "@/app/actions/admin/regions";
import RegionFormModal from "@/components/admin/regions/RegionFormModal";
import {
  collectRegionIds,
  type RegionFlat,
  type RegionTreeNode,
} from "@/lib/regions-tree";
import {
  isRegionActive,
  levelBadgeClass,
  REGION_LEVEL_LABELS,
  RegionLevel,
} from "@/lib/region-levels";
import { getMernisIlceLabel } from "@/lib/mernis-ilce";
import { includesSearchText } from "@/lib/search-text";

type StatusFilter = "all" | "active" | "passive";

interface RegionManagementProps {
  tree: RegionTreeNode[];
  flat: RegionFlat[];
  stats: {
    total: number;
    active: number;
    passive: number;
  };
}

function filterTree(
  nodes: RegionTreeNode[],
  query: string,
  status: StatusFilter
): RegionTreeNode[] {
  const filterNode = (node: RegionTreeNode): RegionTreeNode | null => {
    const children = node.children
      .map(filterNode)
      .filter((child): child is RegionTreeNode => child !== null);

    const matchesQuery = includesSearchText(node.name, query);
    const matchesStatus =
      status === "all" ||
      (status === "active" && isRegionActive(node)) ||
      (status === "passive" && !isRegionActive(node));

    if ((matchesQuery && matchesStatus) || children.length > 0) {
      return { ...node, children };
    }

    return null;
  };

  return nodes
    .map(filterNode)
    .filter((node): node is RegionTreeNode => node !== null);
}

function RegionTags({ region }: { region: RegionFlat }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {region.published ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Yayında
        </span>
      ) : (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          Pasif
        </span>
      )}
      {region.showInSearch && (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          Arama
        </span>
      )}
      {region.showInOffer && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Teklif
        </span>
      )}
      {region.showOnHome && (
        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
          Ana sayfa
        </span>
      )}
      {region.level === RegionLevel.ILCE && region.mernisIlceCode && (
        <span
          className="max-w-[260px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
          title={getMernisIlceLabel(region.mernisIlceCode) ?? undefined}
        >
          {getMernisIlceLabel(region.mernisIlceCode)}
        </span>
      )}
    </div>
  );
}

function RegionTreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  deletingId,
}: {
  node: RegionTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (region: RegionFlat) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);

  return (
    <>
      <div
        className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 ${
          !isRegionActive(node) ? "bg-gray-50/80 opacity-80" : "bg-white"
        }`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 ${
            hasChildren ? "hover:bg-gray-100 hover:text-gray-600" : "invisible"
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={node.image}
            alt={node.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{node.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${levelBadgeClass(node.level)}`}
            >
              {REGION_LEVEL_LABELS[node.level]}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {node.villaCount}
            </span>
          </div>
        </div>

        <div className="hidden min-w-[220px] lg:block">
          <RegionTags region={node} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 transition hover:bg-blue-100"
            title="Düzenle"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            disabled={deletingId === node.id}
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <RegionTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            deletingId={deletingId}
          />
        ))}
    </>
  );
}

export default function RegionManagement({
  tree,
  flat,
  stats,
}: RegionManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(collectRegionIds(tree))
  );
  const [modal, setModal] = useState<
    | { mode: "create"; parentId?: string | null }
    | { mode: "edit"; region: RegionFlat }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredTree = useMemo(
    () => filterTree(tree, search, statusFilter),
    [tree, search, statusFilter]
  );

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(collectRegionIds(filteredTree)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function handleDelete(id: string) {
    const region = flat.find((r) => r.id === id);
    if (!region) return;

    if (
      !window.confirm(
        `"${region.name}" bölgesini silmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }

    setError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteRegion(id);
      if (result.error) setError(result.error);
      setDeletingId(null);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bölge Yönetimi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bölgeleri hiyerarşik olarak yönetin
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Bölge</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pasif</p>
              <p className="text-2xl font-bold text-gray-900">{stats.passive}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Bölge Ağacı</h2>
          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Bölge
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bölge ara..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex rounded-xl border border-gray-200 p-1">
            {(
              [
                ["active", "Aktif"],
                ["passive", "Pasif"],
                ["all", "Tümü"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === value
                    ? "bg-teal-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Aç
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Kapat
            </button>
          </div>
        </div>

        <div>
          {filteredTree.length > 0 ? (
            filteredTree.map((node) => (
              <RegionTreeRow
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={toggleExpanded}
                onEdit={(region) => setModal({ mode: "edit", region })}
                onDelete={handleDelete}
                deletingId={isPending ? deletingId : null}
              />
            ))
          ) : (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              Arama kriterlerine uygun bölge bulunamadı.
            </div>
          )}
        </div>
      </div>

      {modal?.mode === "create" && (
        <RegionFormModal
          regions={flat}
          defaultParentId={modal.parentId}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <RegionFormModal
          regions={flat}
          region={modal.region}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
