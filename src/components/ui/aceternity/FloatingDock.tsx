import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface DockItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

interface FloatingDockProps {
  items: DockItem[];
  className?: string;
}

export function FloatingDock({ items, className }: FloatingDockProps) {
  const location = useLocation();

  return (
    <motion.nav
      aria-label="Quick navigation"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 p-2 rounded-2xl",
        "bg-card/90 backdrop-blur-xl border border-border/50",
        "shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.3)]",
        className
      )}
    >
      {items.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-label={item.title}
            aria-current={isActive ? 'page' : undefined}
            className="relative group"
          >
            <motion.div
              whileHover={{ scale: 1.2, y: -8 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
            
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-popover text-popover-foreground text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {item.title}
            </div>
          </Link>
        );
      })}
    </motion.nav>
  );
}
