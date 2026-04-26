// components/admin/AdminDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMessages } from "@/lib/i18n";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  Activity,
  Dumbbell,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type TrainerType = { type: string; count: number };
type ExpiringSoon = { name: string; email: string; expirationDate: string; type: string };
type ActivityDay = { date: string; count: number };
type OpBreakdown = { operation: string; count: number };
type TopTrainer = { trainerName: string; clientCount: number };
type RecentLog = {
  _id: string;
  operationType: string;
  affectedCollection: string;
  timestamp: string;
  adminUsername: string;
};

type DashboardData = {
  activeTrainers: number;
  expiredTrainers: number;
  deletedTrainers: number;
  totalClients: number;
  trainerTypes: TrainerType[];
  expiringSoon: ExpiringSoon[];
  activityOverTime: ActivityDay[];
  operationBreakdown: OpBreakdown[];
  topTrainersByClients: TopTrainer[];
  recentLogs: RecentLog[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Hook: resolve CSS variables at runtime so recharts gets real colors ───────

type ThemeColors = {
  fg: string;
  // Curated muted palette — slate-blue / teal / amber / purple / gray
  // chosen to be readable AND harmonious with the neutral admin design
  palette: [string, string, string, string, string];
  destructive: string;
  mutedFg: string;
  opColors: Record<string, string>;
};

function readColors(): ThemeColors {
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Two complementary sets: darker tones for light bg, lighter for dark bg
  const palette: [string, string, string, string, string] = isDark
    ? [
      "oklch(0.68 0.11 250)",  // slate-blue
      "oklch(0.68 0.09 170)",  // teal
      "oklch(0.70 0.09 42)",   // amber
      "oklch(0.63 0.09 310)",  // purple
      "oklch(0.62 0 0)",       // gray
    ]
    : [
      "oklch(0.48 0.11 250)",  // slate-blue
      "oklch(0.48 0.09 170)",  // teal
      "oklch(0.52 0.09 42)",   // amber
      "oklch(0.46 0.09 310)",  // purple
      "oklch(0.52 0 0)",       // gray
    ];

  if (typeof document === "undefined") {
    const fg = "oklch(0.145 0 0)";
    const dest = "oklch(0.577 0.245 27.325)";
    return {
      fg,
      palette,
      destructive: dest,
      mutedFg: "oklch(0.556 0 0)",
      opColors: { create: palette[1], update: palette[0], delete: dest, prolong: palette[3] },
    };
  }

  const s = getComputedStyle(document.documentElement);
  const g = (v: string) => s.getPropertyValue(v).trim();

  return {
    fg: g("--foreground"),
    palette,
    destructive: g("--destructive"),
    mutedFg: g("--muted-foreground"),
    opColors: { create: palette[1], update: palette[0], delete: g("--destructive"), prolong: palette[3] },
  };
}

function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(readColors);
  useEffect(() => {
    setColors(readColors());
    const obs = new MutationObserver(() => setColors(readColors()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader className="pb-2">
        <div className="h-4 bg-muted rounded w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="relative h-7 w-7 shrink-0 rounded-md overflow-hidden flex items-center justify-center" style={{ color }}>
          <div className="absolute inset-0 opacity-15 rounded-md" style={{ background: color }} />
          <Icon className="h-3.5 w-3.5 relative z-10" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Custom Pie label renderer ────────────────────────────────────────────────

function renderPieLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!cx || !cy || midAngle == null || !innerRadius || !outerRadius || !percent) return null;
  const RADIAN = Math.PI / 180;
  const cxN = Number(cx);
  const cyN = Number(cy);
  const irN = Number(innerRadius);
  const orN = Number(outerRadius);
  const radius = irN + (orN - irN) * 0.5;
  const x = cxN + radius * Math.cos(-Number(midAngle) * RADIAN);
  const y = cyN + radius * Math.sin(-Number(midAngle) * RADIAN);
  return Number(percent) > 0.05 ? (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[10px] font-medium">
      {Math.round(Number(percent) * 100)}%
    </text>
  ) : null;
}

// ─── Operation badge ──────────────────────────────────────────────────────────

function OpBadge({ op, color }: { op: string; color: string }) {
  return (
    <span className="relative inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide overflow-hidden border" style={{ color, borderColor: color }}>
      <span className="absolute inset-0 opacity-10" style={{ background: color }} />
      <span className="relative">{op}</span>
    </span>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ lang }: { lang: string }) {
  const { t } = getMessages(lang);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const colors = useThemeColors();

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching dashboard:", err);
        setLoading(false);
      });
  }, []);

  const totalOps = data?.operationBreakdown.reduce((s, o) => s + o.count, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar lang={lang} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard")}</h1>
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t("activeTrainers")}
              value={data.activeTrainers}
              icon={UserCheck}
              color={colors.fg}
            />
            <StatCard
              title={t("expiredTrainers")}
              value={data.expiredTrainers}
              icon={UserX}
              color={colors.fg}
            />
            <StatCard
              title={t("totalClients")}
              value={data.totalClients}
              icon={Users}
              color={colors.fg}
            />
            <StatCard
              title={t("totalOperations")}
              value={totalOps}
              icon={Activity}
              color={colors.fg}
            />
          </div>
        ) : null}

        {/* ── Charts Row 1: Activity + Operation Breakdown ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity over time */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{t("activityLast30Days")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data?.activityOverTime ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="actGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.palette[0]} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={colors.palette[0]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10, fill: colors.mutedFg }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: colors.mutedFg }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name={t("activity")}
                      stroke={colors.palette[0]}
                      strokeWidth={2}
                      fill="url(#actGradient)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Operation breakdown pie */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{t("operationBreakdown")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : data?.operationBreakdown.length ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={data.operationBreakdown}
                        dataKey="count"
                        nameKey="operation"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        labelLine={false}
                        label={renderPieLabel}
                      >
                        {data.operationBreakdown.map((entry, i) => (
                          <Cell key={i} fill={colors.opColors[entry.operation] ?? colors.palette[i % colors.palette.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => (
                          <ChartTooltip active={active} payload={payload?.map(p => ({ ...p, name: p.name ?? "" }))} />
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                    {data.operationBreakdown.map((o, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: colors.opColors[o.operation] ?? colors.palette[i % colors.palette.length] }}
                        />
                        {o.operation} ({o.count})
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noRecentActivity")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Charts Row 2: Trainer Distribution + Top Trainers ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trainer type pie */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{t("trainerDistribution")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : data?.trainerTypes.length ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={data.trainerTypes}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        labelLine={false}
                        label={renderPieLabel}
                      >
                        {data.trainerTypes.map((_, i) => (
                          <Cell key={i} fill={colors.palette[i % colors.palette.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => (
                          <ChartTooltip active={active} payload={payload?.map(p => ({ ...p, name: p.name ?? "" }))} />
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                    {data.trainerTypes.map((tt, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: colors.palette[i % colors.palette.length] }}
                        />
                        {tt.type === "personal" ? t("personalTrainer") : t("studioTrainer")} ({tt.count})
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noTrainers")}</p>
              )}
            </CardContent>
          </Card>

          {/* Top trainers by clients bar chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{t("topTrainersByClients")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : data?.topTrainersByClients.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data.topTrainersByClients}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: colors.mutedFg }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="trainerName"
                      tick={{ fontSize: 10, fill: colors.mutedFg }}
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="clientCount"
                      name={t("clients")}
                      radius={[0, 4, 4, 0]}
                    >
                      {data.topTrainersByClients.map((_, i) => (
                        <Cell key={i} fill={colors.palette[i % colors.palette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noClients")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 3: Expiring Soon + Recent Activity ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Expiring soon */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold">{t("expiringSoon")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : data?.expiringSoon.length ? (
                <div className="space-y-2">
                  {data.expiringSoon.map((trainer, i) => {
                    const days = daysUntil(trainer.expirationDate);
                    const urgent = days <= 7;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{trainer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{trainer.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Clock className={cn("h-3.5 w-3.5", urgent ? "text-destructive" : "text-amber-500")} />
                          <span
                            className={cn(
                              "text-xs font-medium whitespace-nowrap",
                              urgent ? "text-destructive" : "text-amber-500"
                            )}
                          >
                            {days}d
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  ✓ {t("noResults")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent activity log */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{t("recentActivity")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : data?.recentLogs.length ? (
                <div className="space-y-1.5">
                  {data.recentLogs.map((log) => (
                    <div
                      key={log._id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors"
                    >
                      <OpBadge op={log.operationType} color={colors.opColors[log.operationType] ?? colors.fg} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-foreground font-medium">
                          {log.affectedCollection}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          · {log.adminUsername}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">{t("noRecentActivity")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
