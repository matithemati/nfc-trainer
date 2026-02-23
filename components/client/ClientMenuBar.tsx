"use client";

import Image from "next/image";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getMessages } from "@/lib/i18n";

type Props = {
  lang: string;
};

export function ClientMenuBar({ lang }: Props) {
  const { t } = getMessages(lang);

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
      </div>
    </div>
  );
}
