import { Link } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

interface ListCardProps {
  to?: string;
  params?: Record<string, string>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ListCard({
  to,
  params,
  title,
  subtitle,
  meta,
  trailing,
  badge,
  actions,
  className,
}: ListCardProps) {
  const inner = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 truncate text-sm font-medium">{title}</div>
          {badge}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
        )}
        {meta && <div className="mt-1 text-[11px] text-muted-foreground">{meta}</div>}
      </div>
      {trailing && (
        <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
          {trailing}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40",
        className
      )}
    >
      {to ? (
        <Link to={to} params={params as any} className="min-w-0 flex-1">
          {inner}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{inner}</div>
      )}
      {actions && (
        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
