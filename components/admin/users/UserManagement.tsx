"use client";

import { useActionState, useEffect, useState } from "react";
import { UserRole, type User } from "@prisma/client";
import { Pencil, UserPlus, Users, X } from "lucide-react";
import {
  createAdminUser,
  updateAdminUser,
  type UserActionState,
} from "@/app/actions/admin/users";
import {
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
} from "@/lib/queries/users";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";
import { formatStoredTurkishPhoneDisplay } from "@/lib/phone-utils";

type AdminUser = Pick<
  User,
  "id" | "name" | "email" | "phone" | "role" | "active"
>;

interface UserManagementProps {
  users: AdminUser[];
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function UserFormFields({
  user,
  isEdit = false,
}: {
  user?: AdminUser;
  isEdit?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Kullanıcı Adı"
        name="name"
        defaultValue={user?.name}
        required
        placeholder="Ad Soyad"
      />
      <Field
        label="E-posta"
        name="email"
        type="email"
        defaultValue={user?.email}
        required
        placeholder="ornek@tatildeyiz.com.tr"
      />
      <Field
        label={isEdit ? "Sistem Şifresi (değiştirmek için doldurun)" : "Sistem Şifresi"}
        name="password"
        type="password"
        required={!isEdit}
        placeholder={isEdit ? "Boş bırakılırsa değişmez" : "En az 6 karakter"}
      />
      <TurkishPhoneField
        name="phone"
        label="Telefon No"
        defaultValue={user?.phone ?? ""}
        focusPalette="indigo"
      />
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Kullanıcı Rolü</span>
        <select
          name="role"
          defaultValue={user?.role ?? UserRole.ADMIN}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>
              {USER_ROLE_LABELS[role]} — {USER_ROLE_DESCRIPTIONS[role]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Durum</span>
        <select
          name="active"
          defaultValue={user?.active === false ? "false" : "true"}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </label>
    </div>
  );
}

const initialState: UserActionState = {};

function CreateUserForm() {
  const [state, formAction, pending] = useActionState(
    createAdminUser,
    initialState
  );
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      setFormKey((k) => k + 1);
    }
  }, [state.success]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Yeni Kullanıcı</h2>
          <p className="text-sm text-gray-500">
            Admin paneline giriş yapabilecek kullanıcı ekleyin
          </p>
        </div>
      </div>

      {state.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Kullanıcı başarıyla oluşturuldu.
        </div>
      )}

      <UserFormFields />

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Kaydediliyor..." : "Kullanıcı Ekle"}
      </button>
    </form>
  );
}

function EditUserModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const updateAction = updateAdminUser.bind(null, user.id);
  const [state, formAction, pending] = useActionState(updateAction, initialState);

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Kullanıcıyı Düzenle</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <UserFormFields user={user} isEdit />
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement({ users }: UserManagementProps) {
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="text-sm text-gray-500">
            Admin paneline giriş yapan kullanıcıları yönetin
          </p>
        </div>
      </div>

      <CreateUserForm />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Kullanıcı Listesi</h2>
          <p className="text-sm text-gray-500">{users.length} kullanıcı</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-3 font-medium">Kullanıcı Adı</th>
                <th className="px-6 py-3 font-medium">E-posta</th>
                <th className="px-6 py-3 font-medium">Telefon</th>
                <th className="px-6 py-3 font-medium">Kullanıcı Rolü</th>
                <th className="px-6 py-3 font-medium">Durum</th>
                <th className="px-6 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatStoredTurkishPhoneDisplay(user.phone)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      {USER_ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setEditingUser(user)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Değiştir
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-400"
                  >
                    Henüz kullanıcı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
