"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Home,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";
import { deleteVillaOwner } from "@/app/actions/admin/villa-owners";
import { includesSearchText } from "@/lib/search-text";
import AuthorizeUserModal from "@/components/admin/villa-owners/AuthorizeUserModal";
import VillaOwnerFormModal from "@/components/admin/villa-owners/VillaOwnerFormModal";
import VillaOwnerLinkedVillasModal from "@/components/admin/villa-owners/VillaOwnerLinkedVillasModal";
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
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<VillaOwnerListItem | null>(
    null
  );
  const [linkedVillasOwner, setLinkedVillasOwner] =
    useState<VillaOwnerListItem | null>(null);
  const [deletingOwnerId, setDeletingOwnerId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      const matchesQuery =
        includesSearchText(owner.name, search) ||
        includesSearchText(owner.phone, search) ||
        includesSearchText(owner.email, search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && owner.active) ||
        (statusFilter === "passive" && !owner.active);

      return matchesQuery && matchesStatus;
    });
  }, [owners, search, statusFilter]);

  function handleDeleteOwner(owner: VillaOwnerListItem) {
    if (owner._count.villas > 0) {
      setDeleteError(
        `"${owner.name}" kaydının ${owner._count.villas} bağlı villası var. Silmeden önce villaları başka bir villa sahibine taşıyın.`
      );
      return;
    }

    if (
      !window.confirm(
        `"${owner.name}" villa sahibi kaydını silmek istiyor musunuz?`
      )
    ) {
      return;
    }

    setDeleteError(null);
    setDeletingOwnerId(owner.id);
    startDeleteTransition(async () => {
      const result = await deleteVillaOwner(owner.id);
      setDeletingOwnerId(null);

      if (result.error) {
        setDeleteError(result.error);
        return;
      }

      if (linkedVillasOwner?.id === owner.id) {
        setLinkedVillasOwner(null);
      }
      if (editingOwner?.id === owner.id) {
        setEditingOwner(null);
      }
      router.refresh();
    });
  }

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

        {deleteError ? (
          <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {deleteError}
          </p>
        ) : null}

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
                  <button
                    type="button"
                    onClick={() => setLinkedVillasOwner(owner)}
                    disabled={owner._count.villas === 0}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Home className="h-3.5 w-3.5" />
                    {owner._count.villas} villa
                  </button>
                </div>

                <div className="flex flex-wrap justify-end gap-2 md:text-right">
                  <button
                    type="button"
                    onClick={() => setEditingOwner(owner)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOwner(owner)}
                    disabled={isDeleting && deletingOwnerId === owner.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    SİL
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
      {linkedVillasOwner ? (
        <VillaOwnerLinkedVillasModal
          owner={linkedVillasOwner}
          onClose={() => setLinkedVillasOwner(null)}
        />
      ) : null}
    </div>
  );
}
