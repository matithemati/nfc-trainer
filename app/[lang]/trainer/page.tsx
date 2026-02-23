// app/[lang]/trainer/page.tsx
import { TrainerView } from "@/components/client/TrainerView";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
