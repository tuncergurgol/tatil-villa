"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AdminTablePaginationBar,
  type AdminPageSize,
} from "@/components/admin/AdminTablePagination";
import {
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { deleteCustomer } from "@/app/actions/admin/customers";
import CustomerFormModal from "@/components/admin/customers/CustomerFormModal";
import type { CustomerListItem } from "@/lib/queries/customers";
import { formatStoredTurkishPhoneDisplay } from "@/lib/phone-utils";
import { includesSearchText } from "@/lib/search-text";

type StatusFilter = "all" | "active" | "passive";

type ContactChannelOption = {
  id: string;
  name: string;
};

interface CustomerManagementProps {
  customers: CustomerListItem[];
  contactChannels: ContactChannelOption[];
}

function formatAdminDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}

export default function CustomerManagement({
  customers,
  contactChannels,
}: CustomerManagementProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesQuery =
        includesSearchText(customer.fullName, search) ||
        includesSearchText(customer.email, search) ||
        includesSearchText(customer.phone, search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.active) ||
        (statusFilter === "passive" && !customer.active);

      return matchesQuery && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visibleCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [currentPage, filteredCustomers, pageSize]);

  function handleDeleteCustomer(customer: CustomerListItem) {
    if (
      !window.confirm(
        `"${customer.fullName}" müşteri kaydını silmek istiyor musunuz?`
      )
    ) {
      return;
    }

    setDeleteError(null);
    setDeletingCustomerId(customer.id);
    startDeleteTransition(async () => {
      const result = await deleteCustomer(customer.id);
      setDeletingCustomerId(null);

      if (result.error) {
        setDeleteError(result.error);
        return;
      }

      if (editingCustomer?.id === customer.id) {
        setEditingCustomer(null);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[180px] items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Müşteri Listesi</h1>
            </div>

            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Ad Soyad, E-posta, Telefon ile Ara..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
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
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
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

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Kayıt
            </button>
          </div>

          {deleteError ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </p>
          ) : null}
        </div>

        <div className="hidden shrink-0 grid-cols-[48px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_88px_72px] gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-sm font-medium text-gray-500 xl:grid">
          <div>#</div>
          <div>Ad Soyad</div>
          <div>Telefon</div>
          <div>E-posta</div>
          <div>Ulaşım Kanalı</div>
          <div>Kayıt / Güncelleme</div>
          <div>Durum</div>
          <div className="text-right">İşlem</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleCustomers.length > 0 ? (
            visibleCustomers.map((customer, index) => (
              <div
                key={customer.id}
                className="grid gap-3 border-b border-gray-100 px-5 py-4 last:border-0 xl:grid-cols-[48px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_88px_72px] xl:items-center xl:gap-3"
              >
                <div className="text-sm font-semibold text-gray-500">
                  {(currentPage - 1) * pageSize + index + 1}
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-400 xl:hidden">
                    Ad Soyad
                  </span>
                  <p className="font-semibold text-gray-900">{customer.fullName}</p>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-400 xl:hidden">
                    Telefon
                  </span>
                  <p className="text-sm text-gray-700">
                    {formatStoredTurkishPhoneDisplay(customer.phone)}
                  </p>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-400 xl:hidden">
                    E-posta
                  </span>
                  <p className="truncate text-sm text-gray-700">
                    {customer.email || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-400 xl:hidden">
                    Ulaşım Kanalı
                  </span>
                  <p className="text-sm text-gray-700">
                    {customer.contactChannel?.name ?? "-"}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-400 xl:hidden">
                    Kayıt / Güncelleme
                  </span>
                  <div className="text-sm text-gray-700">
                    <p>{formatAdminDate(customer.createdAt)}</p>
                    <p className="text-gray-500">
                      {formatAdminDate(customer.updatedAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-400 xl:hidden">
                    Durum
                  </span>
                  <StatusBadge active={customer.active} />
                </div>

                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(customer)}
                    className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    aria-label="Düzenle"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(customer)}
                    disabled={isDeleting && deletingCustomerId === customer.id}
                    className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-16 text-center text-sm text-gray-400">
              Arama kriterlerine uygun müşteri bulunamadı.
            </div>
          )}
        </div>

        <AdminTablePaginationBar
          page={page}
          totalItems={filteredCustomers.length}
          visibleCount={visibleCustomers.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {createOpen ? (
        <CustomerFormModal
          contactChannels={contactChannels}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
      {editingCustomer ? (
        <CustomerFormModal
          customer={editingCustomer}
          contactChannels={contactChannels}
          onClose={() => setEditingCustomer(null)}
        />
      ) : null}
    </div>
  );
}
