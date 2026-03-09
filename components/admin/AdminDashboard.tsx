// components/admin/AdminDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMessages } from "@/lib/i18n";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

type DashboardStats = {
  activeTrainers: number;
  expiredTrainers: number;
  totalClients: number;
};

export function AdminDashboard({ lang }: { lang: string }) {
  const { t } = getMessages(lang);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching dashboard:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar lang={lang} />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("dashboard")}</h1>
          <p className="text-muted-foreground mt-1">{t("adminPanel")}</p>
        </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="h-9 bg-muted animate-pulse rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("activeTrainers")}</CardTitle>
              <CardDescription>{t("activeTrainers")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeTrainers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("expiredTrainers")}</CardTitle>
              <CardDescription>{t("expiredTrainers")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.expiredTrainers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("totalClients")}</CardTitle>
              <CardDescription>{t("totalClients")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalClients}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}
      </div>
    </div>
  );
}
