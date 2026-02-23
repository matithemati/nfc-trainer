"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Props = { lang: "pl" | "en" };

export function LanguageSwitcher({ lang }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const onChange = (value: string) => {
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = value; // podmień lang
    const newPath = "/" + segments.join("/");
    const qs = search.toString();
    router.push(qs ? `${newPath}?${qs}` : newPath);
  };

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
