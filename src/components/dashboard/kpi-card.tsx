import type { ReactNode } from "react";
import { InfoTooltip } from "./info-tooltip";

interface Props {
  label: string;
  value: string;
  hint?: string;
  tooltip: string;
  icon?: ReactNode;
  accent?: "blue" | "green" | "orange" | "lavender" | "teal";
}

const accentMap: Record<NonNullable<Props["accent"]>, string> = {
  blue: "bg-[var(--chart-1)]/15 text-[oklch(0.45_0.08_240)]",
  green: "bg-[var(--chart-2)]/20 text-[oklch(0.40_0.08_160)]",
  orange: "bg-[var(--chart-3)]/20 text-[oklch(0.45_0.10_65)]",
  lavender: "bg-[var(--chart-4)]/20 text-[oklch(0.42_0.09_305)]",
  teal: "bg-[var(--chart-5)]/25 text-[oklch(0.42_0.07_195)]",
};

export function KpiCard({ label, value, hint, tooltip, icon, accent = "blue" }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)] flex flex-col gap-3 min-h-[120px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent]}`}>
              {icon}
            </span>
          )}
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <InfoTooltip description={tooltip} />
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </div>
    </div>
  );
}