"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Home,
  Pencil,
  Phone,
  Plus,
  Search,
  UserCog,
} from "lucide-react";
import AuthorizeUserModal from "@/components/admin/villa-owners/AuthorizeUserModal";
import VillaOwnerFormModal from "@/components/admin/villa-owners/VillaOwnerFormModal";
import type { VillaOwnerListItem } from "@/lib/queries/villa-owners";
import type { TurkeyProvince } from "@/lib/mernis-ilce";
import {
  formatOwnerPhoneDisplay,
  getOwnerAvatarColor,
  getOwnerInitials,
  VILLA_OWNER_TYPE_LABELS,
} from "@/lib/villa-owner-utils";

type StatusFilter = "all" | "active" | "passive";

type UnlinkedUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

interface VillaOwnerManagementProps {
  owners: VillaOwnerListItem[];
  unlinkedUsers: UnlinkedUser[];
  provinces: TurkeyProvince[];
}

export default function VillaOwnerManagement({
  owners,
  unlinkedUsers,
  provinces,
}: VillaOwnerManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<VillaOwnerListItem | null>(
    null
  );

  const filteredOwners = useMemo(() => {
    const query = search.trim().toLowerCase();

    return owners.filter((owner) => {
      const matchesQuery =
        !query ||
        owner.name.toLowerCase().includes(query) ||
        owner.phone.toLowerCase().includes(query) ||
        owner.email.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && owner.active) ||
        (statusFilter === "passive" && !owner.active);

      return matchesQuery && matchesStatus;
    });
  }, [owners, search, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-[180px] items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Villa Sahipleri</h1>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAuthorizeOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              <UserCog className="h-4 w-4" />
              Kayıtlı Kullanıcıya Yetki Ver
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Kayıt
            </button>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-sm font-medium text-gray-500 md:grid">
          <div>Villa Sahibi</div>
          <div>İletişim</div>
          <div>Bağlı Villalar</div>
          <div className="text-right">İşlem</div>
        </div>

        <div>
          {filteredOwners.length > 0 ? (
            filteredOwners.map((owner) => (
              <div
                key={owner.id}
                className="grid gap-3 border-b border-gray-100 px-5 py-4 last:border-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getOwnerAvatarColor(owner.name)}`}
                  >
                    {getOwnerInitials(owner.name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{owner.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        {VILLA_OWNER_TYPE_LABELS[owner.type]}
                      </span>
                      {!owner.active && (
                        <span className="text-xs font-medium text-gray-400">
                          Pasif
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{formatOwnerPhoneDisplay(owner.phone)}</span>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                    <Home className="h-3.5 w-3.5" />
                    {owner._count.villas} villa
                  </span>
                </div>

                <div className="md:text-right">
                  <button
                    type="button"
                    onClick={() => setEditingOwner(owner)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Düzenle
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-16 text-center text-sm text-gray-400">
              Arama kriterlerine uygun villa sahibi bulunamadı.
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <VillaOwnerFormModal
          provinces={provinces}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editingOwner && (
        <VillaOwnerFormModal
          owner={editingOwner}
          provinces={provinces}
          onClose={() => setEditingOwner(null)}
        />
      )}
      {authorizeOpen && (
        <AuthorizeUserModal
          users={unlinkedUsers}
          onClose={() => setAuthorizeOpen(false)}
        />
      )}
    </div>
  );
}
