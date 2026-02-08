"use client";

import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n";

type WeightPoint = { date: string; weight: number };

export function WeightChart({ data, lang }: { data: WeightPoint[]; lang?: string }) {
  const { t, lang: currentLang } = getMessages(lang);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const filteredData = useMemo(() => {
    return data
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
        date: new Date(point.date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
          month: "short",
          day: "numeric",
        }),
      }));
  }, [data, currentMonth, currentYear]);

  const minWeight = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return Math.min(...filteredData.map((d) => d.weight));
  }, [filteredData]);

  const maxWeight = useMemo(() => {
    if (filteredData.length === 0) return 100;
    return Math.max(...filteredData.map((d) => d.weight));
  }, [filteredData]);

  const yAxisDomain = useMemo(() => {
    const padding = (maxWeight - minWeight) * 0.1 || 1;
    return [Math.max(0, minWeight - padding), maxWeight + padding];
  }, [minWeight, maxWeight]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentYear, currentMonth + direction, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(
    currentLang === "pl" ? "pl-PL" : "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(-1)}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today.getMonth());
              setCurrentYear(today.getFullYear());
            }}
          >
            {t("today")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(1)}
          >
            {t("next")}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={yAxisDomain}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                label={{ value: t("weightLabel"), angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4, fill: "#22c55e" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
