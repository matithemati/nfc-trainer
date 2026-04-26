"use client";

import { useState } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type WeightPoint = { date: string; weight: number };

type DimensionEntry = {
  date: string;
  neck?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  calf?: number;
};

const DIMENSION_COLORS: Record<string, string> = {
  neck:  "#ef4444",
  chest: "#f97316",
  waist: "#eab308",
  hips:  "#22c55e",
  bicep: "#06b6d4",
  thigh: "#8b5cf6",
  calf:  "#ec4899",
};

const DIMENSION_KEYS = ["neck", "chest", "waist", "hips", "bicep", "thigh", "calf"] as const;

export function WeightChart({ data, lang }: { data: WeightPoint[]; lang?: string }) {
  const { t, lang: currentLang } = getMessages(lang);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const locale = currentLang === "pl" ? "pl-PL" : "en-US";

  const filteredData = data
    .filter((point) => {
      const pointDate = new Date(point.date);
      return (
        pointDate.getMonth() === currentMonth &&
        pointDate.getFullYear() === currentYear
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      }),
    }));

  const weights = filteredData.map((d) => d.weight);
  const minWeight = weights.length === 0 ? 0 : Math.min(...weights);
  const maxWeight = weights.length === 0 ? 100 : Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 1;
  const yAxisDomain = [Math.max(0, minWeight - padding), maxWeight + padding];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentYear, currentMonth + direction, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(-1)}
            title={t("previous")}
          >
            <ChevronLeft className="size-4 md:hidden" />
            <span className="hidden md:inline">{t("previous")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today.getMonth());
              setCurrentYear(today.getFullYear());
            }}
            title={t("today")}
          >
            <Calendar className="size-4" />
            <span className="hidden md:inline">{t("today")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(1)}
            title={t("next")}
          >
            <ChevronRight className="size-4 md:hidden" />
            <span className="hidden md:inline">{t("next")}</span>
          </Button>
        </div>
      </div>
      <div className="h-80">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t("noWeightDataForMonth")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--tx-3)" }}
                stroke="var(--border)"
              />
              <YAxis
                domain={yAxisDomain}
                tick={{ fontSize: 11, fill: "var(--tx-3)" }}
                stroke="var(--border)"
                label={{ value: t("weightLabel"), angle: -90, position: "insideLeft", style: { fill: "var(--tx-3)" } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--tx-1)" }}
                labelStyle={{ color: "var(--tx-3)" }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--accent)" }}
                activeDot={{ r: 5, fill: "var(--accent)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function DimensionsChart({
  data,
  lang,
  month,
  year,
  onMonthChange,
}: {
  data: DimensionEntry[];
  lang?: string;
  month?: number;
  year?: number;
  onMonthChange?: (month: number, year: number) => void;
}) {
  const { t, lang: currentLang } = getMessages(lang);
  const [internalMonth, setInternalMonth] = useState(new Date().getMonth());
  const [internalYear, setInternalYear] = useState(new Date().getFullYear());

  const currentMonth = month !== undefined ? month : internalMonth;
  const currentYear = year !== undefined ? year : internalYear;

  const locale = currentLang === "pl" ? "pl-PL" : "en-US";

  const filteredData = data
    .filter((entry) => {
      const d = new Date(entry.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry) => ({
      ...entry,
      date: new Date(entry.date).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      }),
    }));

  const activeKeys = DIMENSION_KEYS.filter((key) =>
    filteredData.some((entry) => entry[key] !== undefined && entry[key] !== null)
  );

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentYear, currentMonth + direction, 1);
    const m = newDate.getMonth();
    const y = newDate.getFullYear();
    if (onMonthChange) {
      onMonthChange(m, y);
    } else {
      setInternalMonth(m);
      setInternalYear(y);
    }
  };

  const goToToday = () => {
    const today = new Date();
    if (onMonthChange) {
      onMonthChange(today.getMonth(), today.getFullYear());
    } else {
      setInternalMonth(today.getMonth());
      setInternalYear(today.getFullYear());
    }
  };

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const dimensionLabel = (key: string) => t(`dimension${key.charAt(0).toUpperCase() + key.slice(1)}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)} title={t("previous")}>
            <ChevronLeft className="size-4 md:hidden" />
            <span className="hidden md:inline">{t("previous")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} title={t("today")}>
            <Calendar className="size-4" />
            <span className="hidden md:inline">{t("today")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)} title={t("next")}>
            <ChevronRight className="size-4 md:hidden" />
            <span className="hidden md:inline">{t("next")}</span>
          </Button>
        </div>
      </div>
      <div className="h-80">
        {filteredData.length === 0 || activeKeys.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t("noDimensionsForMonth")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--tx-3)" }} stroke="var(--border)" />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--tx-3)" }}
                stroke="var(--border)"
                label={{ value: t("dimensionsUnit"), angle: -90, position: "insideLeft", style: { fill: "var(--tx-3)" } }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                itemStyle={{ color: "var(--tx-1)" }}
                labelStyle={{ color: "var(--tx-3)" }}
                formatter={(value: number | undefined, name: string | undefined) => [`${value ?? ""} cm`, name ? dimensionLabel(name) : ""]}
              />
              <Legend formatter={(value) => dimensionLabel(value)} />
              {activeKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={DIMENSION_COLORS[key]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: DIMENSION_COLORS[key] }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function WeightTrendChart({ data, lang }: { data: WeightPoint[]; lang?: string }) {
  const { t, lang: currentLang } = getMessages(lang);
  const locale = currentLang === "pl" ? "pl-PL" : "en-US";

  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20)
    .map((p) => ({
      weight: p.weight,
      label: new Date(p.date + "T12:00:00").toLocaleDateString(locale, { month: "short", day: "numeric" }),
    }));

  if (chartData.length < 2) {
    return (
      <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
        {t("noWeightData")}
      </div>
    );
  }

  const vals = chartData.map((d) => d.weight);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.15 || 1;

  return (
    <div className="h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" horizontal stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--tx-3)" }} stroke="transparent" interval="preserveStartEnd" />
          <YAxis domain={[min - pad, max + pad]} tick={{ fontSize: 10, fill: "var(--tx-3)" }} stroke="transparent" width={36} />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
            itemStyle={{ color: "var(--tx-1)" }}
            labelStyle={{ color: "var(--tx-3)" }}
          />
          <Area type="monotone" dataKey="weight" stroke="#7c3aed" strokeWidth={2.5} fill="url(#wGrad)" dot={false} activeDot={{ r: 5, fill: "#7c3aed" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
