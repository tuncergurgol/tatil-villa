"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { deleteVilla } from "@/app/actions/admin/villas";
import { includesSearchText } from "@/lib/search-text";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import { villaAdminEditPath, villaAdminHizliFiyatPath } from "@/lib/villa-admin-path";
import VillaDocumentModal from "@/components/admin/villas/VillaDocumentModal";
import type { AdminVillaListItem } from "@/lib/queries/admin-villas";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";
import { facilityTypeOptions } from "@/lib/facility-type";
import { categoryLabel } from "@/lib/utils";

type StatusFilter = "all" | "active" | "passive";
type TypeFilter = "all" | "villa" | "apart" | "suit_daire";

interface RegionOption {
  id: string;
  slug: string;
  name: string;
}

interface VillaManagementProps {
  villas: AdminVillaListItem[];
  regionOptions: RegionOption[];
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
      <Link href={href} className={`${base} ${className}`}>
        {children}
      </Link>
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
  isPending,
}: {
  villa: AdminVillaListItem;
  onDelete: (id: string, name: string) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);

  const items = [
    {
      label: "Rezervasyonlar",
      href: "/admin/rezervasyonlar",
      icon: Calendar,
    },
    {
      label: "Hızlı Fiyat",
      href: villaAdminHizliFiyatPath(villa),
      icon: FileText,
    },
    {
      label: "Kopyala",
      onClick: () => window.alert("Villa kopyalama yakında eklenecek."),
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-label="Menüyü kapat"
          />
          <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
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
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={isPending && item.danger}
                  onClick={() => {
                    setOpen(false);
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
        </>
      )}
    </div>
  );
}

export default function VillaManagement({
  villas,
  regionOptions,
}: VillaManagementProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [documentModal, setDocumentModal] = useState<AdminVillaListItem | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredVillas = useMemo(() => {
    return villas.filter((villa) => {
      const matchesQuery =
        includesSearchText(villa.name, search) ||
        includesSearchText(villa.regionBreadcrumb, search) ||
        includesSearchText(villa.location, search);

      const matchesRegion =
        regionFilter === "all" || villa.regionIlSlug === regionFilter;

      const matchesType =
        typeFilter === "all" || villa.category === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && villa.active) ||
        (statusFilter === "passive" && !villa.active);

      return matchesQuery && matchesRegion && matchesType && matchesStatus;
    });
  }, [villas, search, regionFilter, typeFilter, statusFilter]);

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

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-[140px] items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Evler</h1>
          </div>

          <button
            type="button"
            onClick={() => window.alert("Rapor indirme yakında eklenecek.")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Rapor
          </button>

          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          >
            <option value="all">Bölge</option>
            {regionOptions.map((region) => (
              <option key={region.id} value={region.slug}>
                {region.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
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

        <div className="divide-y divide-gray-100">
          {filteredVillas.length > 0 ? (
            filteredVillas.map((villa) => {
              const hasDocument = hasVillaTourismDocument(villa);

              return (
                <div
                  key={villa.id}
                  className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
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
                      <p className="truncate text-sm text-gray-500">
                        {villa.regionBreadcrumb || villa.location}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {categoryLabel(villa.category)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <ActionButton
                      href={villaAdminEditPath(villa)}
                      className="border-sky-500 bg-sky-500 text-white hover:bg-sky-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Düzenle
                    </ActionButton>

                    <ActionButton
                      href={villaAdminHizliFiyatPath(villa)}
                      className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Hızlı Fiyat
                    </ActionButton>

                    <ActionButton
                      href={villaTakvimPath(villa.id)}
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
                      isPending={isPending}
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
