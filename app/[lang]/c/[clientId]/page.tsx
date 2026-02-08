// app/[lang]/c/[clientId]/page.tsx
import { ClientView } from "@/components/client/ClientView";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ lang: string; clientId: string }> | { lang: string; clientId: string };
}) {
  const { lang, clientId } = await Promise.resolve(params);
  return <ClientView clientId={clientId} lang={lang} />;
}
