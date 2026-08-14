import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminIdleLogout from "@/components/admin/AdminIdleLogout";
import AdminMobileLayout from "@/components/admin/mobile/AdminMobileLayout";

export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#eef0f3]">
      <AdminIdleLogout />
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <AdminMobileLayout>
          <div className="overflow-y-auto p-3 sm:p-6 lg:p-8">{children}</div>
        </AdminMobileLayout>
      </div>
    </div>
  );
}
