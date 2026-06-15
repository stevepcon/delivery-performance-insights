import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
        <div className="text-xs text-foreground leading-snug">{description}</div>
      </TooltipContent>
    </Tooltip>
  );
}