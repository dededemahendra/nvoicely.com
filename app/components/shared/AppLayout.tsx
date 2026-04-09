import { Link, useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { logout } from "~/lib/auth";
import { toast } from "sonner";
import { primaryNav, secondaryNav } from "./nav";
import { BottomTabBar } from "./BottomTabBar";

export function AppLayout({ children }: { children: React.ReactNode }) {
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
    <div className="grain min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-64 bg-sidebar text-sidebar-foreground lg:block">
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex h-20 items-center px-6">
            <Link to="/" className="group flex items-baseline gap-2">
              <span className="font-display text-3xl leading-none text-[#f4ede0]">
                Ledger
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8aa39a]">
                ·co
              </span>
            </Link>
          </div>

          <div className="mx-6 h-px bg-sidebar-border" />

          <nav className="flex-1 space-y-px px-3 py-5">
            <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6e8a80]">
              Workspace
            </div>
            {primaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#b5c0b9] transition-all hover:bg-sidebar-accent hover:text-[#f4ede0] [&.active]:bg-sidebar-accent [&.active]:text-[#f4ede0]"
              >
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[#86b89c] opacity-0 transition-opacity group-[.active]:opacity-100" />
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mx-6 h-px bg-sidebar-border" />

          <div className="space-y-px p-3">
            {secondaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#b5c0b9] transition-all hover:bg-sidebar-accent hover:text-[#f4ede0] [&.active]:bg-sidebar-accent [&.active]:text-[#f4ede0]"
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#b5c0b9] transition-all hover:bg-sidebar-accent hover:text-[#f4ede0]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
          <Link to="/" className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl leading-none">Ledger</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">·co</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-auto text-muted-foreground"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="page py-6 pb-24 md:py-10 lg:pb-10">{children}</main>
      </div>

      <BottomTabBar />
    </div>
  );
}
