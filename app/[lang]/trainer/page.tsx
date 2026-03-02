// app/[lang]/trainer/page.tsx
import { TrainerView } from "@/components/client/TrainerView";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }> | { lang: string };
}): Promise<Metadata> {
  const { lang } = await Promise.resolve(params);
  const { t } = getMessages(lang);
  return { title: t("trainerHeader") };
}

export default async function TrainerPage({
  params,
}: {
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const { lang } = await Promise.resolve(params);
  const session = await auth();
  
  if (!session?.user) {
    redirect(`/${lang}/auth/signin`);
  }
  
  return <TrainerView lang={lang} />;
}
