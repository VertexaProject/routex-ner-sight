import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("glass rounded-2xl", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5 sm:py-3">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-foreground/80">
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={cn("p-3.5 sm:p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
