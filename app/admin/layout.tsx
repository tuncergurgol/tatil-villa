import type { Metadata } from "next";
import AdminSessionProvider from "@/components/admin/AdminSessionProvider";

export const metadata: Metadata = {
  title: {
    default: "Bont-Yönetim Paneli",
    template: "%s | Bont-Yönetim Paneli",
  },
  applicationName: "Bont-Yönetim Paneli",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
