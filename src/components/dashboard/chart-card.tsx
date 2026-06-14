import type { ReactNode } from "react";
import { InfoTooltip } from "./info-tooltip";

interface Props {
  title: string;
  description?: string;
  tooltip: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, tooltip, action, children, className }: Props) {
  return (
    <section
      className={`rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] p-5 flex flex-col ${className ?? ""}`}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {title}
            <InfoTooltip description={tooltip} />
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}