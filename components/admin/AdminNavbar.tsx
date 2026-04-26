// components/admin/AdminNavbar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { getMessages } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/client/LanguageSwitcher";
import { ThemeToggle } from "@/components/client/ThemeToggle";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  FileText,
  LogOut,
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
    { href: `/${lang}/admin`,          label: t("dashboard"), icon: LayoutDashboard },
    { href: `/${lang}/admin/trainers`, label: t("trainers"),  icon: UserCheck },
    { href: `/${lang}/admin/clients`,  label: t("clients"),   icon: Users },
    { href: `/${lang}/admin/logs`,     label: t("logs"),       icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === `/${lang}/admin`) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 w-full flex items-center h-14 px-4 sm:px-5 bg-card border-b border-border gap-3">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 mr-2">
        <div className="w-7 h-7 rounded-lg bg-destructive flex items-center justify-center shrink-0">
          <span className="text-[9px] font-extrabold text-white tracking-tight">ADM</span>
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight hidden sm:inline">Admin Panel</span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0">
        <LanguageSwitcher lang={lang as "pl" | "en"} />
        <ThemeToggle lang={lang} />
        <div className="w-px h-5 bg-border mx-0.5" />
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="w-5 h-5 rounded-md bg-destructive/20 flex items-center justify-center">
            <span className="text-[9px] font-bold text-destructive">A</span>
          </div>
          <span className="text-xs font-semibold text-foreground hidden sm:inline">admin</span>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </div>
    </nav>
  );
}
