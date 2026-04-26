"use client";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { getMessages } from "@/lib/i18n";

type Props = {
  lang: string;
  trainerName?: string;
  clientName?: string;
};

export function ClientMenuBar({ lang, trainerName, clientName }: Props) {
  const { t } = getMessages(lang);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-[8px] font-extrabold text-primary-foreground tracking-tight">NFC</span>
        </div>
        {trainerName && (
          <span className="text-xs font-medium text-muted-foreground">
            {t("trainerHeader")}: {trainerName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher lang={lang as "pl" | "en"} />
        <ThemeToggle lang={lang} />
      </div>
    </div>
  );
}
