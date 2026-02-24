"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Props = { lang: "pl" | "en" };

export function LanguageSwitcher({ lang }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onChange = (value: string) => {
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = value; // podmień lang
    const newPath = "/" + segments.join("/");
    const qs = search.toString();
    router.push(qs ? `${newPath}?${qs}` : newPath);
  };

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted) {
    return (
      <div className="w-[70px] sm:w-[120px] h-9 border border-input rounded-md bg-transparent flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{lang.toUpperCase()}</span>
      </div>
    );
  }

  return (
    <Select value={lang} onValueChange={onChange}>
      <SelectTrigger className="w-[70px] sm:w-[120px] text-black">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pl">PL</SelectItem>
        <SelectItem value="en">EN</SelectItem>
      </SelectContent>
    </Select>
  );
}
