import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminIdleLogout from "@/components/admin/AdminIdleLogout";

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
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
