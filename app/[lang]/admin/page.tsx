// app/[lang]/admin/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentAdmin } from "@/lib/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
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

  return <AdminDashboard lang={lang} />;
}
