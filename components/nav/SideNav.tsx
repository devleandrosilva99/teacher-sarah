"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  Home,
  Settings,
  Shield,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/components/ui";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  classes: UsersRound,
  questions: BookOpen,
  passages: FileText,
  activities: ClipboardList,
  grading: CheckSquare,
  calendar: CalendarDays,
  reports: BarChart3,
  bell: Bell,
  settings: Settings,
  shield: Shield,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
  exact?: boolean;
}

export default function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-brand-soft font-medium text-brand-ink" : "text-ink-2 hover:bg-surface-raised hover:text-ink"
            )}
          >
            <Icon size={17} />
            <span>{item.label}</span>
            {!!item.badge && (
              <span className="ml-auto rounded-full bg-brand px-1.5 text-[11px] font-medium text-white">{item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
