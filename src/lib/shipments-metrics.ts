import type { Shipment } from "./shipments-api";

export const SUCCESS_STATUSES = ["delivered"];
export const FAILURE_STATUSES = ["delivery_failed", "returned_to_warehouse"];

export interface Filters {
  carrier: string; // "all" or carrier name
  service: "all" | "express" | "standard";
  range: "7" | "30" | "90" | "all";
}

export function applyFilters(shipments: Shipment[], f: Filters): Shipment[] {
  let cutoff: number | null = null;
  if (f.range !== "all") {
    const days = Number(f.range);
    cutoff = Date.now() - days * 86400_000;
  }
  return shipments.filter((s) => {
    if (f.carrier !== "all" && s.carrier?.name !== f.carrier) return false;
    if (f.service !== "all" && (s.carrier_service ?? "").toLowerCase() !== f.service) return false;
    if (cutoff !== null) {
      const t = new Date(s.order_date).getTime();
      if (isNaN(t) || t < cutoff) return false;
    }
    return true;
  });
}

export function daysBetween(a: string, b: string): number | null {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (isNaN(ta) || isNaN(tb)) return null;
  return Math.max(0, (tb - ta) / 86400_000);
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface Kpis {
  total: number;
  successRate: number;
  failureRate: number;
  avgDeliveryDays: number;
  expressDays: number;
  standardDays: number;
  activeCarriers: number;
  firstAttemptRate: number;
  onTimeRate: number;
  exceptionRate: number;
  avgTransitDays: number;
  reliabilityScore: number;
}

function deliveryDays(s: Shipment): number | null {
  return daysBetween(s.order_date, s.promised_delivery_date);
}

function transitDays(s: Shipment): number | null {
  return daysBetween(s.planned_pickup_datetime, s.promised_delivery_date);
}

export function computeKpis(shipments: Shipment[]): Kpis {
  const total = shipments.length;
  const delivered = shipments.filter((s) => SUCCESS_STATUSES.includes(s.shipment_status));
  const failed = shipments.filter((s) => FAILURE_STATUSES.includes(s.shipment_status));
  const successRate = total ? delivered.length / total : 0;
  const failureRate = total ? failed.length / total : 0;

  const deliveredDays = delivered.map(deliveryDays).filter((x): x is number => x !== null);
  const expressDays = avg(
    shipments
      .filter((s) => s.carrier_service?.toLowerCase() === "express")
      .map(deliveryDays)
      .filter((x): x is number => x !== null),
  );
  const standardDays = avg(
    shipments
      .filter((s) => s.carrier_service?.toLowerCase() === "standard")
      .map(deliveryDays)
      .filter((x): x is number => x !== null),
  );
  const transit = shipments.map(transitDays).filter((x): x is number => x !== null);

  const carriers = new Set(shipments.map((s) => s.carrier?.name).filter(Boolean));

  // First-attempt = delivered / (delivered + failed)
  const firstAttemptDenom = delivered.length + failed.length;
  const firstAttemptRate = firstAttemptDenom ? delivered.length / firstAttemptDenom : 0;

  // On-time = delivered shipments where the order-to-promised window is <= 5 days (treated as promised window kept)
  const onTimeDelivered = delivered.filter((s) => {
    const d = deliveryDays(s);
    return d !== null && d <= 5;
  });
  const onTimeRate = delivered.length ? onTimeDelivered.length / delivered.length : 0;

  // Exception rate: failed / total
  const exceptionRate = failureRate;

  const reliabilityScore = (successRate * 0.7 + onTimeRate * 0.3) * 100;

  return {
    total,
    successRate,
    failureRate,
    avgDeliveryDays: avg(deliveredDays),
    expressDays,
    standardDays,
    activeCarriers: carriers.size,
    firstAttemptRate,
    onTimeRate,
    exceptionRate,
    avgTransitDays: avg(transit),
    reliabilityScore,
  };
}

export interface CarrierRow {
  carrier: string;
  shipments: number;
  successRate: number;
  failureRate: number;
  avgDeliveryDays: number;
  onTimeRate: number;
  reliabilityScore: number;
}

export function carrierBreakdown(shipments: Shipment[]): CarrierRow[] {
  const groups = new Map<string, Shipment[]>();
  for (const s of shipments) {
    const k = s.carrier?.name ?? "unknown";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }
  return [...groups.entries()].map(([carrier, group]) => {
    const k = computeKpis(group);
    return {
      carrier,
      shipments: group.length,
      successRate: k.successRate,
      failureRate: k.failureRate,
      avgDeliveryDays: k.avgDeliveryDays,
      onTimeRate: k.onTimeRate,
      reliabilityScore: k.reliabilityScore,
    };
  });
}

export function volumeByDay(shipments: Shipment[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of shipments) {
    const d = new Date(s.order_date);
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}

export function uniqueCarriers(shipments: Shipment[]): string[] {
  return [...new Set(shipments.map((s) => s.carrier?.name).filter(Boolean))].sort() as string[];
}

export function toCsv(shipments: Shipment[]): string {
  const cols: (keyof Shipment | string)[] = [
    "shipment_id",
    "order_id",
    "order_date",
    "promised_delivery_date",
    "shipment_status",
    "carrier",
    "carrier_service",
    "warehouse",
    "recipient_country",
    "recipient_city",
    "weight",
    "goods_value",
    "product_name",
    "product_category",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = shipments.map((s) =>
    cols
      .map((c) => {
        if (c === "carrier") return esc(s.carrier?.name ?? "");
        // @ts-expect-error dynamic
        return esc(s[c]);
      })
      .join(","),
  );
  return [cols.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateInsights(rows: CarrierRow[]): string[] {
  if (!rows.length) return [];
  const sortedBySuccess = [...rows].sort((a, b) => b.successRate - a.successRate);
  const sortedBySpeed = [...rows].filter((r) => r.avgDeliveryDays > 0).sort((a, b) => a.avgDeliveryDays - b.avgDeliveryDays);
  const sortedByFailure = [...rows].sort((a, b) => b.failureRate - a.failureRate);
  const insights: string[] = [];
  if (sortedBySuccess[0])
    insights.push(
      `${sortedBySuccess[0].carrier.toUpperCase()} has the highest success rate at ${(sortedBySuccess[0].successRate * 100).toFixed(1)}%.`,
    );
  if (sortedByFailure[0])
    insights.push(
      `${sortedByFailure[0].carrier.toUpperCase()} has the highest failure rate at ${(sortedByFailure[0].failureRate * 100).toFixed(1)}%.`,
    );
  if (sortedBySpeed[0])
    insights.push(
      `${sortedBySpeed[0].carrier.toUpperCase()} is the fastest carrier with ${sortedBySpeed[0].avgDeliveryDays.toFixed(1)} day average delivery.`,
    );
  if (sortedBySpeed.at(-1))
    insights.push(
      `${sortedBySpeed.at(-1)!.carrier.toUpperCase()} is the slowest carrier with ${sortedBySpeed.at(-1)!.avgDeliveryDays.toFixed(1)} day average delivery.`,
    );
  return insights;
}