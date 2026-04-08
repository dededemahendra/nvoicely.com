import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  RefreshCw,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/recurring", label: "Recurring", icon: RefreshCw },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export const secondaryNav: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings },
];

// Mobile bottom tab bar — keep to 5 max for thumb reach.
export const mobileTabs: NavItem[] = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/settings", label: "More", icon: Settings },
];
