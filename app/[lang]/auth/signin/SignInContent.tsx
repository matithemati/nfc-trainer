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
import { Mail, AlertCircle } from "lucide-react";

export function SignInContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params?.lang as "pl" | "en") || "en";
  const { t } = getMessages(lang);
  const { theme } = useTheme();
  const callbackUrl = searchParams.get("callbackUrl") || `/${lang}/trainer`;
  const error = searchParams.get("error");
  const [errorMessage, setErrorMessage] = useState<string | null>(error);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com";
  const mailtoLink = `mailto:${adminEmail}?subject=${encodeURIComponent(t("licensePurchaseSubject"))}&body=${encodeURIComponent(t("licensePurchaseBody"))}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 space-y-8 relative">
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

      {errorMessage ? (
        <Card className="w-full max-w-md border-2 border-destructive/20">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="size-12 text-destructive" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {t("noAccountTitle")}
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {t("noAccountMessage")}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a href={mailtoLink}>
                  <Mail className="size-4" />
                  {t("contactAdminForLicense")}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("signIn")}</CardTitle>
            <CardDescription>{t("signInDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full"
            >
              {t("signInWithGoogle")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
