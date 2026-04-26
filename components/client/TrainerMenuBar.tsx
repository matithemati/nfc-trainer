"use client";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LogOut, ChevronDown, Users, Dumbbell, User } from "lucide-react";
import { getMessages } from "@/lib/i18n";

type Trainer = {
  _id: string;
  name: string;
  email: string;
  maxClients: number;
  expirationDate?: string | null;
};

type Tab = "clients" | "library" | "account";

type Props = {
  trainer: Trainer;
  clientsCount: number;
  lang: string;
  onLogout: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function TrainerMenuBar({ trainer, clientsCount, lang, onLogout, activeTab, onTabChange }: Props) {
  const { t } = getMessages(lang);

  const navTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "clients", label: t("clients"), icon: <Users className="size-3.5" /> },
    { id: "library", label: t("exercisesTab"), icon: <Dumbbell className="size-3.5" /> },
    { id: "account", label: t("account"), icon: <User className="size-3.5" /> },
  ];

  return (
    <div className="flex items-center h-14 px-4 sm:px-5 bg-card border-b border-border shrink-0 gap-3">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 mr-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-[10px] font-extrabold text-primary-foreground tracking-tight">NFC</span>
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight hidden sm:inline">Trainer</span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0">
        <LanguageSwitcher lang={lang as "pl" | "en"} />
        <ThemeToggle lang={lang} />
        <div className="w-px h-5 bg-border mx-0.5" />
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-primary">{getInitials(trainer.name)}</span>
              </div>
              <span className="hidden sm:inline text-sm font-semibold text-foreground">
                {trainer.name.split(" ")[0]}
              </span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          }
          align="right"
        >
          <div className="px-3 py-2.5 border-b mb-1">
            <div className="text-sm font-semibold text-foreground">{trainer.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{trainer.email}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("clients")}: {clientsCount} / {trainer.maxClients}
            </div>
          </div>
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="size-3.5 mr-2" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </div>
  );
}
