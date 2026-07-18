import type { Metadata } from "next";
import AdminSessionProvider from "@/components/admin/AdminSessionProvider";

export const metadata: Metadata = {
  title: {
    absolute: "Bont-Yönetim Paneli",
  },
  applicationName: "Bont-Yönetim Paneli",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
