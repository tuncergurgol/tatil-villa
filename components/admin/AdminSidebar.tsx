import Link from "next/link";
import { signOut } from "@/auth";
import {
  Building2,
  Calendar,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/villalar", label: "Villalar", icon: Home },
  { href: "/admin/rezervasyonlar", label: "Rezervasyonlar", icon: Calendar },
  { href: "/admin/kampanyalar", label: "Kampanyalar", icon: Megaphone },
  { href: "/admin/bolgeler", label: "Bölgeler", icon: MapPin },
];

export default function AdminSidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-teal-950 text-white">
      <div className="border-b border-white/10 p-5">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <Building2 className="h-5 w-5" />
          Admin Panel
        </Link>
        <Link href="/" className="mt-1 block text-xs text-teal-300 hover:text-white">
          Siteye Dön →
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-teal-100 transition hover:bg-white/10 hover:text-white"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
        className="border-t border-white/10 p-3"
      >
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-teal-200 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </form>
    </aside>
  );
}
