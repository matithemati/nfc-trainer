"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMessages } from "@/lib/i18n";
import { useSearchParams, useParams } from "next/navigation";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/client/LanguageSwitcher";
import { useTheme } from "@/components/providers/ThemeProvider";

export function AdminSignInContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params?.lang as "pl" | "en") || "en";
  const { t } = getMessages(lang);
  const { theme } = useTheme();
  const callbackUrl = searchParams.get("callbackUrl") || `/${lang}/admin`;
  const error = searchParams.get("error");
  const [errorMessage, setErrorMessage] = useState<string | null>(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] space-y-8 relative">
      <div className="absolute top-0 right-0">
        <LanguageSwitcher lang={lang as "pl" | "en"} />
      </div>

      <div className="flex flex-col items-center space-y-4">
        <Image
          src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
          alt={t("appTitle")}
          width={200}
          height={186}
          className="h-auto w-32 sm:w-[200px]"
          priority
        />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("adminPanel")}</CardTitle>
          <CardDescription>{t("adminSignInDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {t("adminOnly")}
            </div>
          )}
          <Button
            onClick={() => {
              setErrorMessage(null);
              signIn("google", { callbackUrl });
            }}
            className="w-full"
          >
            {t("signInWithGoogle")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
