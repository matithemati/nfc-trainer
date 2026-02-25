// app/[lang]/layout.tsx
import { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { HomeHeader } from "@/components/client/HomeHeader";

export const dynamic = "force-dynamic";

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const { lang: langParam } = await Promise.resolve(params);
  const { lang } = getMessages(langParam);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <HomeHeader lang={lang} />
      <main>{children}</main>
    </div>
  );
}
