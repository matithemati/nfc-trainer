// app/[lang]/admin/clients/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentAdmin } from "@/lib/admin";
import { ClientsManagement } from "@/components/admin/ClientsManagement";
import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }> | { lang: string };
}): Promise<Metadata> {
  const { lang } = await Promise.resolve(params);
  const { t } = getMessages(lang);
  return { title: t("clients") };
}

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const { lang } = await Promise.resolve(params);
  const session = await auth();
  const admin = await getCurrentAdmin();

  if (!session) {
    redirect(`/${lang}/admin/signin`);
  }

  if (!admin) {
    redirect(`/${lang}/admin/signin?error=not_admin`);
  }

  return <ClientsManagement lang={lang} />;
}
