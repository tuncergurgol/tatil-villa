"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Calendar,
  Copy,
  Download,
  FileText,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Plus,
} from "lucide-react";
import { copyVilla, deleteVilla } from "@/app/actions/admin/villas";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import { villaAdminEditPath, villaAdminHizliFiyatPath } from "@/lib/villa-admin-path";
import VillaDocumentModal from "@/components/admin/villas/VillaDocumentModal";
import type { AdminVillaListItem } from "@/lib/queries/admin-villas";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";
import { facilityTypeOptions } from "@/lib/facility-type";
import type { RegionTreeNode } from "@/lib/regions-tree";
import {
  appendVillaListQuery,
  buildVillaListPath,
  buildVillaListSearchParams,
  matchesVillaListSearch,
  parseVillaListFilters,
  type VillaListStatusFilter,
  type VillaListTypeFilter,
} from "@/lib/villa-list-filters";
import { downloadVillaPriceReportExcel } from "@/lib/villa-price-report";
import VillaRegionTreeFilter from "@/components/admin/villas/VillaRegionTreeFilter";

type StatusFilter = VillaListStatusFilter;
type TypeFilter = VillaListTypeFilter;

interface VillaManagementProps {
  villas: AdminVillaListItem[];
  regionTree: RegionTreeNode[];
}

function ActionButton({
  href,
  onClick,
  children,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition";

  if (href) {
    return (
      <a href={href} className={`${base} ${className}`}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${className}`}>
      {children}
    </button>
  );
}

function VillaRowMenu({
  villa,
  onDelete,
  onCopy,
  isPending,
  listQuery,
  open,
  onOpenChange,
}: {
  villa: AdminVillaListItem;
  onDelete: (id: string, name: string) => void;
  onCopy: (id: string, name: string) => void;
  isPending: boolean;
  listQuery: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const hizliFiyatPath = appendVillaListQuery(
    villaAdminHizliFiyatPath(villa),
    listQuery
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onOpenChange]);

  const items = [
    {
      label: "Rezervasyonlar",
      href: "/admin/rezervasyonlar",
      icon: Calendar,
    },
    {
      label: "Hızlı Fiyat",
      href: hizliFiyatPath,
      icon: FileText,
    },
    {
      label: "Kopyala",
      onClick: () => onCopy(villa.id, villa.name),
      icon: Copy,
    },
    {
      label: "Sil",
      onClick: () => onDelete(villa.id, villa.name),
      icon: Trash2,
      danger: true,
    },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </>
            );

            if (item.href) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                disabled={isPending && (item.danger || item.label === "Kopyala")}
                onClick={() => {
                  onOpenChange(false);
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  item.danger ? "text-red-600" : "text-gray-700"
                }`}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function VillaManagement({
  villas,
  regionTree,
}: VillaManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseVillaListFilters(searchParams),
    [searchParams]
  );
  const [search, setSearch] = useState(filters.q);
  const listQuery = useMemo(
    () =>
      buildVillaListSearchParams({
        ...filters,
        q: search,
      }).toString(),
    [filters, search]
  );
  const [documentModal, setDocumentModal] = useState<AdminVillaListItem | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isReportPending, startReportTransition] = useTransition();
  const [openMenuVillaId, setOpenMenuVillaId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current === document.activeElement) return;
    setSearch(filters.q);
  }, [filters.q]);

  function commitSearchToUrl(nextSearch = search) {
    if (nextSearch.trim() === filters.q.trim()) return;
    router.replace(
      buildVillaListPath({
        ...filters,
        q: nextSearch,
      }),
      { scroll: false }
    );
  }

  function updateFilters(
    patch: Partial<{
      q: string;
      regions: string[];
      type: TypeFilter;
      status: StatusFilter;
    }>
  ) {
    router.replace(
      buildVillaListPath({
        ...filters,
        q: search,
        ...patch,
      }),
      { scroll: false }
    );
  }

  const filteredVillas = useMemo(() => {
    return villas.filter((villa) => {
      const matchesQuery = matchesVillaListSearch(villa, search);

      const matchesRegion =
        filters.regions.length === 0 ||
        villa.regionPathSlugs.some((slug) => filters.regions.includes(slug));

      const matchesType =
        filters.type === "all" || villa.category === filters.type;

      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "active" && villa.active) ||
        (filters.status === "passive" && !villa.active);

      return matchesQuery && matchesRegion && matchesType && matchesStatus;
    });
  }, [villas, search, filters]);

  function handleCopy(id: string, name: string) {
    if (
      !window.confirm(
        `"${name}" villasının bir kopyası oluşturulsun mu?\n\nFotoğraflar, belge bilgileri, fiyatlar ve özellikler kopyalanır; takvimdeki dolu günler aktarılmaz.`
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await copyVilla(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(result.editPath);
      router.refresh();
    });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" silinsin mi?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteVilla(id);
      } catch {
        setError("Villa silinemedi");
      }
    });
  }

  function handleExportReport() {
    if (filteredVillas.length === 0) {
      window.alert("Filtreye uygun villa bulunamadı.");
      return;
    }

    startReportTransition(async () => {
      const params = buildVillaListSearchParams({
        ...filters,
        q: search,
      });
      const response = await fetch(
        `/api/admin/villa-price-report?${params.toString()}`
      );

      if (!response.ok) {
        window.alert("Excel raporu oluşturulamadı.");
        return;
      }

      const data = (await response.json()) as {
        rows: (string | number)[][];
        filename: string;
        rowCount: number;
      };

      if (data.rowCount === 0) {
        window.alert("Dışa aktarılacak kayıt bulunamadı.");
        return;
      }

      await downloadVillaPriceReportExcel(data.rows, data.filename);
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-[140px] items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Evler</h1>
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={isReportPending}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isReportPending ? "Hazırlanıyor…" : "Rapor"}
          </button>

          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => commitSearchToUrl()}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                commitSearchToUrl();
              }}
              placeholder="Villa adı, orijinal adı veya belge no ile ara..."
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <VillaRegionTreeFilter
            tree={regionTree}
            selectedSlugs={filters.regions}
            onChange={(regions) => updateFilters({ regions })}
          />

          <select
            value={filters.type}
            onChange={(e) =>
              updateFilters({ type: e.target.value as TypeFilter })
            }
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          >
            <option value="all">Tip</option>
            {facilityTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

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
                onClick={() => updateFilters({ status: value })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filters.status === value
                    ? "bg-teal-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Link
            href="/admin/villalar/yeni"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Villa Oluştur
          </Link>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
          {filteredVillas.length > 0 ? (
            filteredVillas.map((villa) => {
              const hasDocument = hasVillaTourismDocument(villa);

              return (
                <div
                  key={villa.id}
                  className={`flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between ${
                    openMenuVillaId === villa.id ? "relative z-30" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                      {villa.image ? (
                        <Image
                          src={villa.image}
                          alt={villa.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          IMG
                        </div>
                      )}
                    </div>

                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        villa.active ? "bg-teal-500" : "bg-orange-400"
                      }`}
                      title={villa.active ? "Aktif" : "Pasif"}
                    />

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {villa.name}
                      </p>
                      {villa.originalName.trim() ? (
                        <p className="truncate text-sm text-gray-500">
                          ({villa.originalName})
                        </p>
                      ) : null}
                      <p className="truncate text-sm text-gray-500">
                        {villa.regionBreadcrumb || villa.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <ActionButton
                      href={appendVillaListQuery(
                        villaAdminEditPath(villa),
                        listQuery
                      )}
                      className="border-sky-500 bg-sky-500 text-white hover:bg-sky-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Düzenle
                    </ActionButton>

                    <ActionButton
                      href={appendVillaListQuery(
                        villaTakvimPath({
                          id: villa.id,
                          villaId: villa.villaId,
                        }),
                        listQuery
                      )}
                      className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Takvim
                    </ActionButton>

                    <button
                      type="button"
                      onClick={() => setDocumentModal(villa)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        hasDocument
                          ? "border-gray-200 bg-white text-emerald-700 hover:bg-gray-50"
                          : "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {hasDocument && villa.documentNo
                        ? `Belge ${villa.documentNo}`
                        : "Belge"}
                    </button>

                    <VillaRowMenu
                      villa={villa}
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                      isPending={isPending}
                      listQuery={listQuery}
                      open={openMenuVillaId === villa.id}
                      onOpenChange={(nextOpen) =>
                        setOpenMenuVillaId(nextOpen ? villa.id : null)
                      }
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-16 text-center text-sm text-gray-500">
              Kayıt bulunamadı.
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
          Toplam {filteredVillas.length} / {villas.length} ev
        </div>
      </div>

      {documentModal && (
        <VillaDocumentModal
          villaId={documentModal.id}
          villaName={documentModal.name}
          onClose={() => setDocumentModal(null)}
          onSaved={() => {
            setDocumentModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
