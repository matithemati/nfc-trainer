// app/[lang]/layout.tsx
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }> | { lang: string };
}) {
  // Individual pages handle their own layout/container
  return <>{children}</>;
}
