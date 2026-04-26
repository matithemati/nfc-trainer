"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { getMessages } from "@/lib/i18n";

type Props = { lang: string };

export function ThemeToggle({ lang }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { t } = getMessages(lang);

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "light" ? t("darkMode") : t("lightMode")}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-muted-foreground text-xs font-medium transition-all"
    >
      {theme === "light" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      <span className="hidden sm:inline">{theme === "light" ? t("darkMode") : t("lightMode")}</span>
    </button>
  );
}
