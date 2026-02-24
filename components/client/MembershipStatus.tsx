"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { getMessages } from "@/lib/i18n";

type Trainer = {
  _id: string;
  name: string;
  email: string;
  maxClients: number;
  expirationDate?: string | null; // ISO date string
};

type Props = {
  trainer: Trainer;
  clientsCount: number;
  lang: string;
};

export function MembershipStatus({ trainer, clientsCount, lang }: Props) {
  const { t } = getMessages(lang);
  
  const expirationDate = trainer.expirationDate 
    ? new Date(trainer.expirationDate)
    : null;
  
  const isExpired = expirationDate 
    ? expirationDate < new Date()
    : false;
  
  // Membership is active if expirationDate is null (no expiration) or in the future
  const isActive = !expirationDate || !isExpired;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("membershipStatus")}</span>
          <Badge variant={isActive ? "success" : "destructive"}>
            {isActive ? t("active") : t("inactive")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t("clients")}:</span>
          <span className="font-medium">{clientsCount} / {trainer.maxClients}</span>
        </div>
        
        {expirationDate ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("expirationDate")}:</span>
            <span className={isExpired ? "font-medium text-destructive" : "font-medium"}>
              {formatDate(expirationDate)}
            </span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t("noExpirationDate")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
