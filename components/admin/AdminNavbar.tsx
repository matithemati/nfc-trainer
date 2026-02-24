// components/admin/AdminNavbar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/client/LanguageSwitcher";
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  FileText, 
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AdminNavbar({ lang }: { lang: string }) {
  const { t } = getMessages(lang);
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: `/${lang}/admin`,
      label: t("dashboard"),
      icon: LayoutDashboard,
    },
    {
      href: `/${lang}/admin/trainers`,
      label: t("trainers"),
      icon: UserCheck,
    },
    {
      href: `/${lang}/admin/clients`,
      label: t("clients"),
      icon: Users,
    },
    {
      href: `/${lang}/admin/logs`,
      label: t("logs"),
      icon: FileText,
    },
  ];

  const isActive = (href: string) => {
    if (href === `/${lang}/admin`) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo/Title */}
        <div className="flex items-center">
          <h2 className="text-base font-medium text-foreground tracking-wider uppercase opacity-90">
            {t("adminPanel")}
          </h2>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Button
                key={item.href}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => router.push(item.href)}
                className={cn(
                  "gap-2 transition-colors",
                  active 
                    ? "bg-secondary text-secondary-foreground font-medium" 
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher lang={lang as "pl" | "en"} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="gap-2 text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("logout")}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
