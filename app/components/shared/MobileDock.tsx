import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Dock } from "~/components/ui/dock-two";
import { mobileTabs } from "./nav";

export function MobileDock() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <Dock
        className="w-full justify-around rounded-none border-x-0 border-b-0 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
        items={mobileTabs.map((t) => ({
          icon: t.icon,
          label: t.label,
          isActive: isActive(t.to),
          onClick: () => navigate({ to: t.to }),
        }))}
      />
    </div>
  );
}
