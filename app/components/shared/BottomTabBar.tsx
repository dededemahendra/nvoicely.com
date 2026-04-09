import { Link } from "@tanstack/react-router";
import { mobileTabs } from "./nav";

export function BottomTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {mobileTabs.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="group relative flex h-14 flex-col items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
            >
              <span className="absolute inset-x-3 top-1 h-[2px] rounded-full bg-primary opacity-0 transition-opacity group-[.active]:opacity-100" />
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="leading-none">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
