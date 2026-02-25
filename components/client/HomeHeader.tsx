"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getMessages } from "@/lib/i18n";

type Props = { lang: string };

export function HomeHeader({ lang }: Props) {
  const pathname = usePathname();
  const { t } = getMessages(lang);
  const { theme } = useTheme();

  // Only show header on home page (exact match with /pl or /en)
  const isHomePage = pathname === `/${lang}`;

  if (!isHomePage) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pb-3 mb-4">
      <div className="flex items-center">
        <Image
          src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
          alt={t("appTitle")}
          width={80}
          height={75}
          className="h-auto w-12 sm:w-20"
          priority
        />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
        <ThemeToggle lang={lang} />
        <LanguageSwitcher lang={lang as "pl" | "en"} />
      </div>
    </div>
  );
}
