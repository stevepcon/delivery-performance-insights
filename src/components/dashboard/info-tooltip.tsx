import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE } from "@/lib/shipments-api";

interface Props {
  description: string;
}

export function InfoTooltip({ description }: Props) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Data source"
          className="text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs bg-card text-card-foreground border border-border shadow-[var(--shadow-soft)] p-3 text-left"
      >
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Data Source
          </div>
          <div className="font-mono text-[10px] break-all text-foreground/80">{API_BASE}</div>
          <div className="pt-1 text-xs text-foreground leading-snug">{description}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}