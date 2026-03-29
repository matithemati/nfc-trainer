"use client";

import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const RPE_OPTIONS = ["1-4", "5-6", "7", "7.5", "8", "8.5", "9", "9.5", "10"] as const;
export type RpeValue = (typeof RPE_OPTIONS)[number];

const RPE_STYLES: Record<
  string,
  { pill: string; active: string; badge: string }
> = {
  "1-4": {
    pill:   "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
    active: "bg-emerald-500 text-white shadow-sm",
    badge:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  "5-6": {
    pill:   "bg-lime-100 text-lime-700 hover:bg-lime-200 dark:bg-lime-900/30 dark:text-lime-400",
    active: "bg-lime-500 text-white shadow-sm",
    badge:  "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-400",
  },
  "7": {
    pill:   "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
    active: "bg-yellow-500 text-white shadow-sm",
    badge:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  },
  "7.5": {
    pill:   "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    active: "bg-amber-500 text-white shadow-sm",
    badge:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  "8": {
    pill:   "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
    active: "bg-orange-500 text-white shadow-sm",
    badge:  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  },
  "8.5": {
    pill:   "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    active: "bg-orange-600 text-white shadow-sm",
    badge:  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  "9": {
    pill:   "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400",
    active: "bg-red-500 text-white shadow-sm",
    badge:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  "9.5": {
    pill:   "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300",
    active: "bg-red-600 text-white shadow-sm",
    badge:  "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  "10": {
    pill:   "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
    active: "bg-rose-600 text-white shadow-sm",
    badge:  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
};

function rpeDescKey(rpe: string) {
  return `rpeDesc${rpe.replace(".", "_").replace("-", "_")}`;
}

function RpeInfoDialog({ lang }: { lang?: string }) {
  const { t } = getMessages(lang);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full p-0.5 hover:bg-muted"
          tabIndex={-1}
        >
          <Info className="size-3.5" />
          <span className="sr-only">RPE info</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{t("rpeScaleTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
          {[...RPE_OPTIONS].reverse().map((rpe) => (
            <div key={rpe} className="flex gap-3 items-start">
              <span
                className={cn(
                  "shrink-0 min-w-[40px] text-center px-2 py-0.5 rounded-md text-xs font-bold",
                  RPE_STYLES[rpe].active
                )}
              >
                {rpe}
              </span>
              <p className="text-sm text-muted-foreground leading-snug">
                {t(rpeDescKey(rpe))}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RpeSelectorProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  lang?: string;
}

export function RpeSelector({ value, onChange, lang }: RpeSelectorProps) {
  const { t } = getMessages(lang);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium leading-none">
          RPE <span className="font-normal">({t("optional")})</span>
        </span>
        <RpeInfoDialog lang={lang} />
      </div>
      <div className="flex flex-wrap gap-1">
        {RPE_OPTIONS.map((rpe) => {
          const isSelected = value === rpe;
          return (
            <button
              key={rpe}
              type="button"
              onClick={() => onChange(isSelected ? undefined : rpe)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-100",
                isSelected ? RPE_STYLES[rpe].active : RPE_STYLES[rpe].pill
              )}
            >
              {rpe}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RpeBadge({ value }: { value: string }) {
  const style = RPE_STYLES[value];
  if (!style) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold",
        style.badge
      )}
    >
      RPE {value}
    </span>
  );
}
