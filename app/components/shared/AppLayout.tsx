import { Link, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  RefreshCw,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useUIStore } from "~/stores/uiStore";
import { logout } from "~/lib/auth";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/recurring", label: "Recurring", icon: RefreshCw },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
      router.navigate({ to: "/login" });
    } catch {
      toast.error("Failed to log out");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 border-r bg-card transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5" />
              <span>InvoiceGen</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="border-t p-3 space-y-1">
            <Link
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-3 font-semibold">InvoiceGen</span>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
