import { Link, useRouter } from "@tanstack/react-router";
import { FileText, LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-60 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-5">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <FileText className="h-5 w-5" />
              <span>InvoiceGen</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-0.5 p-3">
            {primaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-0.5 border-t p-3">
            {secondaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
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

      {/* Main */}
      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-12 items-center border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 lg:hidden">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FileText className="h-4 w-4" />
            <span>InvoiceGen</span>
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

        <main className="page py-4 pb-24 md:py-6 lg:pb-8">{children}</main>
      </div>

      <BottomTabBar />
    </div>
  );
}
