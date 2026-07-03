import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { getAdminUsers } from "@/lib/queries/users";
import UserManagement from "@/components/admin/users/UserManagement";

export const dynamic = "force-dynamic";

export default async function KullanicilarPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (role !== UserRole.ADMIN) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="text-lg font-bold text-amber-900">Yetkisiz Erişim</h1>
        <p className="mt-2 text-sm text-amber-800">
          Kullanıcı yönetimi yalnızca Yönetici rolündeki kullanıcılar tarafından
          erişilebilir.
        </p>
      </div>
    );
  }

  const users = await getAdminUsers();

  return <UserManagement users={users} />;
}
