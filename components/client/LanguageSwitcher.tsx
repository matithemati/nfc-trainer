"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = { lang: "pl" | "en" };

export function LanguageSwitcher({ lang }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const onChange = (value: string) => {
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = value;
    const newPath = "/" + segments.join("/");
    const qs = search.toString();
    router.push(qs ? `${newPath}?${qs}` : newPath);
  };

  if (!mounted) {
    return (
      <div className="flex bg-muted/60 border border-border rounded-lg p-0.5 gap-0.5">
        {["en", "pl"].map((l) => (
          <div key={l} className={`px-2.5 py-1 rounded-md text-xs font-medium ${l === lang ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {l.toUpperCase()}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex bg-muted/60 border border-border rounded-lg p-0.5 gap-0.5">
      {(["en", "pl"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            lang === l
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
