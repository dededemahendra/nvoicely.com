import { useRouterState } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";
import { AppBreadcrumbs } from "~/components/app-breadcrumbs";
import { CustomSidebarTrigger } from "~/components/custom-sidebar-trigger";
import { GlobalSearch } from "~/components/shared/GlobalSearch";
import { ThemeToggle } from "~/components/shared/ThemeToggle";
import { primaryNav, secondaryNav } from "~/components/shared/nav";

const allNav = [...primaryNav, ...secondaryNav];

function currentTitle(pathname: string): string | undefined {
  if (pathname === "/") return "Dashboard";
  return allNav.find((n) => n.to !== "/" && pathname.startsWith(n.to))?.label;
}

export function AppHeader({ userId }: { userId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = currentTitle(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6"
      )}
    >
      <CustomSidebarTrigger />
      <Separator
        className="mr-2 h-4 data-[orientation=vertical]:self-center"
        orientation="vertical"
      />
      <AppBreadcrumbs page={title ? { title } : null} />
      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch userId={userId} />
        <ThemeToggle />
      </div>
    </header>
  );
}
