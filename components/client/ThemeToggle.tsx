"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { getMessages } from "@/lib/i18n";

type Props = { lang: string };

export function ThemeToggle({ lang }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { t } = getMessages(lang);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      aria-label={theme === "light" ? t("darkMode") : t("lightMode")}
      title={theme === "light" ? t("darkMode") : t("lightMode")}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
