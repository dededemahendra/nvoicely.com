import { Link } from "@tanstack/react-router";
import { mobileTabs } from "./nav";

export function BottomTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {mobileTabs.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
            >
              <item.icon className="h-5 w-5" strokeWidth={2} />
              <span className="leading-none">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
