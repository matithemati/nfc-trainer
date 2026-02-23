"use client";

import Image from "next/image";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { LogOut, ChevronDown } from "lucide-react";
import { getMessages } from "@/lib/i18n";

type Trainer = {
  _id: string;
  name: string;
  email: string;
  maxClients: number;
  isPaid: boolean;
  expirationDate?: string | null;
};

type Props = {
  trainer: Trainer;
  clientsCount: number;
  lang: string;
  onLogout: () => void;
};

export function TrainerMenuBar({ trainer, clientsCount, lang, onLogout }: Props) {
  const { t } = getMessages(lang);
  const firstName = trainer.name.split(" ")[0];

  // Check if membership is active
  const expirationDate = trainer.expirationDate 
    ? new Date(trainer.expirationDate)
    : null;
  
  const isExpired = expirationDate 
    ? expirationDate < new Date()
    : false;
  
  const isMembershipActive = trainer.isPaid && !isExpired;

  return (
    <div className="flex items-center justify-between pb-3 mb-4">
      <div className="flex items-center">
        <Image
          src="/logo.png"
          alt={t("appTitle")}
          width={120}
          height={112}
          className="h-auto w-16 sm:w-[120px]"
          priority
        />
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-3">
        <LanguageSwitcher lang={lang as "pl" | "en"} />
        
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 py-1 sm:py-1.5 rounded-md hover:bg-accent transition-colors">
              <div className="sm:hidden">
                <Avatar name={trainer.name} size="sm" />
              </div>
              <div className="hidden sm:block">
                <Avatar name={trainer.name} size="default" />
              </div>
              <span className="hidden sm:inline font-medium text-sm text-foreground">{firstName}</span>
              <ChevronDown className="size-3 sm:size-3.5 text-muted-foreground" />
            </button>
          }
          align="right"
        >
          <div className="px-3 py-2.5 border-b mb-1">
            <div className="text-sm font-medium">{trainer.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{trainer.email}</div>
            {isMembershipActive && (
              <div className="text-xs text-muted-foreground mt-1">
                {t("clients")}: {clientsCount} / {trainer.maxClients}
              </div>
            )}
          </div>
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="size-4 mr-2" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </div>
  );
}
