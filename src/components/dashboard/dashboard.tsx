import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Truck,
  Package,
  Building2,
  RefreshCw,
  RotateCcw,
  Moon,
  Sun,
  Lightbulb,
  Gauge,
  Info as InfoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

import { fetchAllShipments, type Shipment } from "@/lib/shipments-api";
import {
  applyFilters,
  carrierBreakdown,
  computeKpis,
  generateInsights,
  uniqueCarriers,
  volumeByDay,
  type Filters,
} from "@/lib/shipments-metrics";
import { KpiCard } from "./kpi-card";
import { ChartCard } from "./chart-card";
import { CarrierTable } from "./carrier-table";
import { InfoTooltip } from "./info-tooltip";

const PASTEL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const PCT = (n: number) => `${(n * 100).toFixed(1)}%`;
const DAYS = (n: number) => (n > 0 ? `${n.toFixed(1)} d` : "—");

function formatTimestamp(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Dashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [filters, setFilters] = useState<Filters>({
    carrier: "all",
    service: "all",
    range: "all",
  });
  const [dark, setDark] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const filtered = useMemo(() => applyFilters(shipments, filters), [shipments, filters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const carriers = useMemo(() => uniqueCarriers(shipments), [shipments]);
  const breakdown = useMemo(() => carrierBreakdown(filtered), [filtered]);
  const insights = useMemo(() => generateInsights(breakdown), [breakdown]);
  const volume = useMemo(() => volumeByDay(filtered), [filtered]);

  const handleSync = async () => {
    setLoading(true);
    setProgress({ loaded: 0, total: 1000 });
    try {
      const data = await fetchAllShipments(10, 100, (loaded, total) =>
        setProgress({ loaded, total }),
      );
      setShipments(data);
      setLastSync(new Date());
      toast.success("Data synced", {
        description: `Loaded ${data.length.toLocaleString()} shipments from the live API.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Sync failed", { description: msg });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleReset = () => {
    setShipments([]);
    setLastSync(null);
    setFilters({ carrier: "all", service: "all", range: "all" });
    toast("Dashboard reset", { description: "All loaded data has been cleared." });
  };

  const successData = [
    { name: "Successful", value: Math.round(kpis.successRate * filtered.length) },
    { name: "Failed", value: Math.round(kpis.failureRate * filtered.length) },
    {
      name: "In progress",
      value: Math.max(
        0,
        filtered.length -
          Math.round(kpis.successRate * filtered.length) -
          Math.round(kpis.failureRate * filtered.length),
      ),
    },
  ].filter((d) => d.value > 0);

  const SUCCESS_COLORS: Record<string, string> = {
    Successful: "var(--chart-2)",
    Failed: "var(--chart-3)",
    "In progress": "var(--chart-1)",
  };

  const carrierSuccessData = breakdown.map((r) => ({
    carrier: r.carrier.toUpperCase(),
    rate: +(r.successRate * 100).toFixed(1),
  }));

  const carrierSpeedData = breakdown.map((r) => ({
    carrier: r.carrier.toUpperCase(),
    days: +r.avgDeliveryDays.toFixed(2),
  }));

  const methodData = [
    { method: "Express", days: +kpis.expressDays.toFixed(2) },
    { method: "Standard", days: +kpis.standardDays.toFixed(2) },
  ];

  const empty = shipments.length === 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto max-w-[1400px] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[var(--chart-1)]/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-[oklch(0.45_0.08_240)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
                  Delivery Performance Insights
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {lastSync ? `Last synced: ${formatTimestamp(lastSync)}` : "Not synced yet"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAboutOpen(true)}
                className="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-border bg-card text-sm hover:bg-secondary transition-colors"
              >
                <InfoIcon className="h-4 w-4" />
                About
              </button>
              <button
                onClick={() => setDark((d) => !d)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={handleReset}
                disabled={empty && !loading}
                className="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-border bg-card text-sm hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Data
              </button>
              <button
                onClick={handleSync}
                disabled={loading}
                className="h-9 inline-flex items-center gap-2 px-4 rounded-lg bg-[var(--chart-1)] text-[oklch(0.25_0.05_240)] text-sm font-medium hover:brightness-95 transition-all disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Syncing…" : "Sync Data"}
              </button>
            </div>
          </div>
          {loading && progress && (
            <div className="h-0.5 w-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-[var(--chart-1)] transition-all"
                style={{ width: `${Math.min(100, (progress.loaded / Math.max(1, progress.total)) * 100)}%` }}
              />
            </div>
          )}
        </header>

        <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
          {/* Filters */}
          <section className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)] flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mr-1">
              Filters
            </div>
            <FilterSelect
              value={filters.carrier}
              onChange={(v) => setFilters((f) => ({ ...f, carrier: v }))}
              label="Carrier"
              options={[{ value: "all", label: "All Carriers" }, ...carriers.map((c) => ({ value: c, label: c.toUpperCase() }))]}
            />
            <FilterSelect
              value={filters.service}
              onChange={(v) => setFilters((f) => ({ ...f, service: v as Filters["service"] }))}
              label="Service"
              options={[
                { value: "all", label: "All Methods" },
                { value: "express", label: "Express" },
                { value: "standard", label: "Standard" },
              ]}
            />
            <FilterSelect
              value={filters.range}
              onChange={(v) => setFilters((f) => ({ ...f, range: v as Filters["range"] }))}
              label="Range"
              options={[
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
                { value: "all", label: "All time" },
              ]}
            />
            <div className="ml-auto text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground tabular-nums">
                {filtered.length.toLocaleString()}
              </span>{" "}
              of {shipments.length.toLocaleString()} shipments
            </div>
          </section>

          {empty && !loading && <EmptyBanner />}

          {/* KPI grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            <KpiCard
              label="Total Shipments"
              value={kpis.total.toLocaleString()}
              tooltip="Total shipment records currently loaded from the API, after filters."
              icon={<Package className="h-4 w-4" />}
              accent="blue"
            />
            <KpiCard
              label="Success Rate"
              value={PCT(kpis.successRate)}
              tooltip="Successful deliveries divided by total shipments."
              icon={<CheckCircle2 className="h-4 w-4" />}
              accent="green"
            />
            <KpiCard
              label="Failure Rate"
              value={PCT(kpis.failureRate)}
              tooltip="Failed and returned shipments divided by total shipments."
              icon={<XCircle className="h-4 w-4" />}
              accent="orange"
            />
            <KpiCard
              label="Avg Delivery Time"
              value={DAYS(kpis.avgDeliveryDays)}
              tooltip="Average days from order creation to promised delivery, for delivered shipments."
              icon={<Clock className="h-4 w-4" />}
              accent="lavender"
            />
            <KpiCard
              label="Express Speed"
              value={DAYS(kpis.expressDays)}
              tooltip="Average delivery time for Express service shipments."
              icon={<Zap className="h-4 w-4" />}
              accent="teal"
            />
            <KpiCard
              label="Standard Speed"
              value={DAYS(kpis.standardDays)}
              tooltip="Average delivery time for Standard service shipments."
              icon={<Activity className="h-4 w-4" />}
              accent="blue"
            />
            <KpiCard
              label="Active Carriers"
              value={String(kpis.activeCarriers)}
              tooltip="Distinct carriers present in the currently loaded shipment data."
              icon={<Building2 className="h-4 w-4" />}
              accent="green"
            />
          </section>

          {/* Insights */}
          {insights.length > 0 && (
            <section className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
              <header className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--chart-3)]/25 text-[oklch(0.45_0.10_65)]">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  Top Insights
                  <InfoTooltip description="Plain-English observations generated from the filtered carrier breakdown." />
                </h3>
              </header>
              <ul className="grid sm:grid-cols-2 gap-2">
                {insights.map((line, i) => (
                  <li
                    key={i}
                    className="text-sm text-foreground bg-secondary/60 rounded-lg px-3 py-2 leading-snug"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Charts row 1 */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard
              title="Delivery Success vs Failure"
              tooltip="Breakdown of shipment outcomes for the current filter."
              className="lg:col-span-1 h-[340px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={successData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {successData.map((_, i) => (
                      <Cell key={i} fill={SUCCESS_COLORS[successData[i].name] ?? PASTEL[i % PASTEL.length]} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Carrier Success Rate"
              tooltip="Percentage of successful deliveries by carrier."
              className="lg:col-span-2 h-[340px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carrierSuccessData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="carrier" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} unit="%" />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, "Success"]}
                  />
                  <Bar dataKey="rate" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          {/* Charts row 2 */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard
              title="Average Delivery Time by Carrier"
              tooltip="Average days from order creation to promised delivery, grouped by carrier."
              className="lg:col-span-2 h-[340px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carrierSpeedData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="carrier" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} unit="d" />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} days`, "Avg"]}
                  />
                  <Bar dataKey="days" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Shipping Method Performance"
              tooltip="Average delivery time for Express vs Standard services."
              className="lg:col-span-1 h-[340px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="method" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} unit="d" />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} days`, "Avg"]}
                  />
                  <Bar dataKey="days" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          {/* Volume trend */}
          <ChartCard
            title="Delivery Volume Trend"
            description="Shipments per day"
            tooltip="Number of shipments per day based on order_date, after filters."
            className="h-[320px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volume} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Logistics performance metrics */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Logistics Performance Metrics
              </h2>
              <InfoTooltip description="Operational KPIs derived from shipment outcomes and timing fields." />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <KpiCard
                label="First Attempt Rate"
                value={PCT(kpis.firstAttemptRate)}
                tooltip="Delivered shipments divided by delivered + failed shipments."
                icon={<CheckCircle2 className="h-4 w-4" />}
                accent="green"
              />
              <KpiCard
                label="On-Time Rate"
                value={PCT(kpis.onTimeRate)}
                tooltip="Delivered shipments whose order-to-promised window is within 5 days."
                icon={<Clock className="h-4 w-4" />}
                accent="blue"
              />
              <KpiCard
                label="Reliability Score"
                value={`${kpis.reliabilityScore.toFixed(0)}/100`}
                hint="Success × 70% + On-time × 30%"
                tooltip="Carrier reliability score = success rate × 0.7 + on-time rate × 0.3."
                icon={<Gauge className="h-4 w-4" />}
                accent="lavender"
              />
              <KpiCard
                label="Exception Rate"
                value={PCT(kpis.exceptionRate)}
                tooltip="Shipments with delivery failures or returns, divided by total."
                icon={<XCircle className="h-4 w-4" />}
                accent="orange"
              />
              <KpiCard
                label="Avg Transit Time"
                value={DAYS(kpis.avgTransitDays)}
                tooltip="Average days from planned pickup to promised delivery."
                icon={<Truck className="h-4 w-4" />}
                accent="teal"
              />
            </div>
          </section>

          {/* Carrier comparison + ranking */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <ChartCard
              title="Carrier Comparison"
              tooltip="Per-carrier shipment counts, success/failure rates, average delivery time and reliability score. Click a column header to sort."
              className="xl:col-span-2"
            >
              <CarrierTable rows={breakdown} />
            </ChartCard>
            <ChartCard
              title="Carrier Ranking"
              description="By reliability score"
              tooltip="Carriers ranked by reliability score (combines success and on-time rate)."
            >
              <ol className="space-y-2">
                {[...breakdown]
                  .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
                  .map((r, i) => (
                    <li
                      key={r.carrier}
                      className="flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2"
                    >
                      <span className="h-6 w-6 rounded-md bg-card border border-border text-xs font-semibold flex items-center justify-center tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground uppercase">
                        {r.carrier}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {r.reliabilityScore.toFixed(0)} · {r.avgDeliveryDays.toFixed(1)}d
                      </span>
                    </li>
                  ))}
                {!breakdown.length && (
                  <li className="text-sm text-muted-foreground text-center py-6">
                    No carrier data.
                  </li>
                )}
              </ol>
            </ChartCard>
          </section>

        </main>
        <Toaster richColors position="bottom-right" />
        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold">About</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-foreground leading-relaxed">
              <p>
                This demo application was built by Steven Conway (
                <a
                  href="https://www.linkedin.com/in/steven-conway"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[oklch(0.45_0.08_240)] underline underline-offset-2 hover:no-underline"
                >
                  LinkedIn
                </a>
                )
              </p>
              <p>
                The app uses mock data based on realistic shipment and carrier data models,
                allowing users to explore common logistics KPIs, delivery performance metrics,
                and carrier comparisons in a safe demonstration environment.
              </p>
              <div className="space-y-1.5">
                <p className="font-bold">Technology Stack</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Web application built with Lovable</li>
                  <li>API built using Claude and Google Apps Script</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 min-w-[160px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyBanner() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto h-12 w-12 rounded-full bg-[var(--chart-1)]/15 flex items-center justify-center mb-3">
        <Package className="h-5 w-5 text-[oklch(0.45_0.08_240)]" />
      </div>
      <h2 className="text-base font-semibold text-foreground">No shipment data loaded</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Click <span className="font-medium text-foreground">Sync Data</span> in the header to fetch
        demo shipments from the live API.
      </p>
    </div>
  );
}