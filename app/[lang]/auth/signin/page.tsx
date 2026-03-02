// app/[lang]/auth/signin/page.tsx
import { Suspense } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { SignInContent } from "./SignInContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }> | { lang: string };
}): Promise<Metadata> {
  const { lang } = await Promise.resolve(params);
  const { t } = getMessages(lang);
  return { title: t("signIn") };
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 sm:w-[200px] sm:h-[186px] bg-muted animate-pulse rounded-lg" />
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          </div>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
