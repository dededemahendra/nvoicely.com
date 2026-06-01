import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { type LucideIcon } from "lucide-react";

interface DockProps {
  className?: string;
  items: {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    isActive?: boolean;
  }[];
}

interface DockIconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, isActive, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        type="button"
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "relative group rounded-xl p-3 transition-colors",
          isActive ? "bg-secondary" : "hover:bg-secondary",
          className
        )}
      >
        <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
        <span
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2",
            "rounded px-2 py-1 text-xs",
            "bg-popover text-popover-foreground",
            "pointer-events-none whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100"
          )}
        >
          {label}
        </span>
      </motion.button>
    );
  }
);
DockIconButton.displayName = "DockIconButton";

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1 rounded-2xl p-2",
          "border border-border bg-background/90 shadow-lg backdrop-blur-lg",
          className
        )}
      >
        {items.map((item) => (
          <DockIconButton key={item.label} {...item} />
        ))}
      </div>
    );
  }
);
Dock.displayName = "Dock";

export { Dock, DockIconButton };
