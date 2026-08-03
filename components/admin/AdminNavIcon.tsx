"use client";

import {
  BarChart3,
  BedDouble,
  Bot,
  Building2,
  Bus,
  CalendarCheck,
  CalendarDays,
  Car,
  Compass,
  FileCheck2,
  Home,
  Import,
  ListTree,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Phone,
  Search,
  Settings,
  Shield,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminNavIcon } from "@/lib/admin-nav";

const iconMap: Record<AdminNavIcon, LucideIcon> = {
  bed: BedDouble,
  search: Search,
  "calendar-check": CalendarCheck,
  home: Home,
  calendar: CalendarDays,
  "list-tree": ListTree,
  settings: Settings,
  users: Users,
  user: User,
  "bar-chart": BarChart3,
  "file-check": FileCheck2,
  compass: Compass,
  bus: Bus,
  car: Car,
  ticket: Ticket,
  building: Building2,
  import: Import,
  "message-circle": MessageCircle,
  "message-square": MessageSquare,
  shield: Shield,
  newspaper: Newspaper,
  chart: BarChart3,
  megaphone: Megaphone,
  phone: Phone,
  bot: Bot,
};

export default function AdminNavIcon({
  name,
  className = "h-4 w-4",
}: {
  name?: AdminNavIcon;
  className?: string;
}) {
  if (!name) return null;
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={className} aria-hidden />;
}
