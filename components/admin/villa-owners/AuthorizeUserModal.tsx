"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Search, UserCog, X } from "lucide-react";
import {
  authorizeUserAsVillaOwner,
  type VillaOwnerActionState,
} from "@/app/actions/admin/villa-owners";
import { includesSearchText } from "@/lib/search-text";
import { useRefreshOnActionSuccess } from "@/components/admin/AdminPageRefresh";

type UnlinkedUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

interface AuthorizeUserModalProps {
  users: UnlinkedUser[];
  onClose: () => void;
}

export default function AuthorizeUserModal({
  users,
  onClose,
}: AuthorizeUserModalProps) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<
    VillaOwnerActionState,
    FormData
  >(authorizeUserAsVillaOwner, {});

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        includesSearchText(user.name, search) ||
        includesSearchText(user.email, search)
    );
  }, [users, search]);

  useRefreshOnActionSuccess(state.success);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Kayıtlı Kullanıcıya Yetki Ver
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-6">
          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kullanıcı ara..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-gray-100 p-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                    selectedUserId === user.id
                      ? "border-teal-300 bg-teal-50"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="userId"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={() => setSelectedUserId(user.id)}
                    className="mt-1 h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </label>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                Yetki verilebilecek kullanıcı bulunamadı.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={pending || !selectedUserId}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Yetki Ver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
