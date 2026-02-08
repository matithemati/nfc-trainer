// app/[lang]/layout.tsx
import "../globals.css";
import { ReactNode } from "react";
import Image from "next/image";
import { getMessages } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/client/LanguageSwitcher";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const { lang: langParam } = await Promise.resolve(params);
  const { t, lang } = getMessages(langParam);

  return (
    <html lang={lang}>
      <body className="min-h-screen text-slate-100" suppressHydrationWarning>
        <div className="max-w-5xl mx-auto p-4 space-y-4">
          <header className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt={t("appTitle")}
                width={150}
                height={140}
                className="h-auto"
                priority
              />
            </div>
            <LanguageSwitcher lang={lang} />
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
