// app/[lang]/t/[trainerId]/page.tsx
import { TrainerView } from "@/components/client/TrainerView";

export default async function TrainerPage({
  params,
}: {
  params: Promise<{ lang: string; trainerId: string }> | { lang: string; trainerId: string };
}) {
  const { lang, trainerId } = await Promise.resolve(params);
  return <TrainerView trainerId={trainerId} lang={lang} />;
}
