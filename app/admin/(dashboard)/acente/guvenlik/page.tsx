import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import SecurityLogManagement from "@/components/admin/security/SecurityLogManagement";
import { getSecurityPageData } from "@/lib/queries/security";

export const dynamic = "force-dynamic";

export default async function GuvenlikPage() {
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
          Güvenlik & Log yalnızca Yönetici rolündeki kullanıcılar tarafından
          erişilebilir.
        </p>
      </div>
    );
  }

  const data = await getSecurityPageData();
  return <SecurityLogManagement data={data} />;
}
