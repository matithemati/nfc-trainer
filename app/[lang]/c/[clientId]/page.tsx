// app/[lang]/c/[clientId]/page.tsx
import { ClientView } from "@/components/client/ClientView";
import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; clientId: string }> | { lang: string; clientId: string };
}): Promise<Metadata> {
  const { lang, clientId } = await Promise.resolve(params);
  const { t } = getMessages(lang);

  if (ObjectId.isValid(clientId)) {
    try {
      const db = await getDb();
      const client = await db
        .collection("clients")
        .findOne({ _id: new ObjectId(clientId) }, { projection: { name: 1 } });
      if (client?.name) {
        return { title: client.name };
      }
    } catch {}
  }

  return { title: t("clientHeader") };
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ lang: string; clientId: string }> | { lang: string; clientId: string };
}) {
  const { lang, clientId } = await Promise.resolve(params);
  return <ClientView clientId={clientId} lang={lang} />;
}
