import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { AppHeader } from "~/components/app-header";
import { AppSidebar } from "~/components/app-sidebar";
import { MobileDock } from "~/components/shared/MobileDock";

export function AppShell({
  user,
  children,
}: {
  user: { id: string; name: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden">
      <SidebarProvider className="relative h-svh">
        <AppSidebar user={user} />
        <SidebarInset className="overflow-hidden md:peer-data-[variant=inset]:ml-0">
          <AppHeader userId={user.id} />
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="page w-full py-6 pb-24 md:py-8 lg:pb-8">
              {children}
            </div>
          </div>
        </SidebarInset>
        <MobileDock />
      </SidebarProvider>
    </div>
  );
}
