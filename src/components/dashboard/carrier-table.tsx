import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Trophy, AlertTriangle } from "lucide-react";
import type { CarrierRow } from "@/lib/shipments-metrics";

type SortKey = keyof Pick<
  CarrierRow,
  "carrier" | "shipments" | "successRate" | "failureRate" | "avgDeliveryDays" | "reliabilityScore"
>;

const cols: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "carrier", label: "Carrier" },
  { key: "shipments", label: "Shipments", align: "right" },
  { key: "successRate", label: "Success", align: "right" },
  { key: "failureRate", label: "Failure", align: "right" },
  { key: "avgDeliveryDays", label: "Avg Days", align: "right" },
  { key: "reliabilityScore", label: "Reliability", align: "right" },
];

export function CarrierTable({ rows }: { rows: CarrierRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "shipments",
    dir: "desc",
  });

  const sorted = [...rows].sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const av = a[sort.key];
    const bv = b[sort.key];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  const best = rows.length
    ? [...rows].sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0].carrier
    : null;
  const worst = rows.length
    ? [...rows].sort((a, b) => a.reliabilityScore - b.reliabilityScore)[0].carrier
    : null;

  const handleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  };

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm border-separate border-spacing-y-1 px-2">
        <thead>
          <tr className="text-xs text-muted-foreground">
            {cols.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                <button
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => handleSort(c.key)}
                >
                  {c.label}
                  {sort.key === c.key ? (
                    sort.dir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const isBest = r.carrier === best;
            const isWorst = r.carrier === worst && best !== worst;
            return (
              <tr
                key={r.carrier}
                className={`bg-card transition-colors ${
                  isBest
                    ? "ring-1 ring-[var(--success)]/40"
                    : isWorst
                      ? "ring-1 ring-[var(--destructive)]/30"
                      : ""
                }`}
              >
                <td className="px-3 py-3 rounded-l-lg">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground text-[10px] font-semibold uppercase">
                      {r.carrier.slice(0, 3)}
                    </span>
                    <span className="font-medium text-foreground uppercase tracking-wide text-xs">
                      {r.carrier}
                    </span>
                    {isBest && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--success)]/15 text-[oklch(0.40_0.08_160)]">
                        <Trophy className="h-3 w-3" /> Best
                      </span>
                    )}
                    {isWorst && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--destructive)]/12 text-[oklch(0.45_0.13_25)]">
                        <AlertTriangle className="h-3 w-3" /> Needs attention
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">{r.shipments}</td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {(r.successRate * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {(r.failureRate * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {r.avgDeliveryDays.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground rounded-r-lg">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-[var(--chart-1)]"
                        style={{ width: `${Math.min(100, r.reliabilityScore)}%` }}
                      />
                    </span>
                    {r.reliabilityScore.toFixed(0)}
                  </span>
                </td>
              </tr>
            );
          })}
          {!sorted.length && (
            <tr>
              <td colSpan={cols.length} className="text-center py-10 text-sm text-muted-foreground">
                No carrier data yet. Click <span className="font-medium">Sync Data</span> to load.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}