// app/[lang]/page.tsx
import { getMessages } from "@/lib/i18n";

export default async function HomePage({ 
  params 
}: { 
  params: Promise<{ lang: string }> | { lang: string } 
}) {
  const { lang } = await Promise.resolve(params);
  const { t } = getMessages(lang);

  return (
    <div className="space-y-4">
      <p>{t("appTitle")} - {t("homeDescription")}</p>
      <p>
        {t("homeInstructions")}
      </p>
    </div>
  );
}
