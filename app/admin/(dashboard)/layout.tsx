import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#eef0f3]">
      <AdminSidebar />
      <div className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">{children}</div>
    </div>
  );
}
