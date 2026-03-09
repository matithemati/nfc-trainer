import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "size-6 rounded-full border-2 border-border border-t-foreground animate-spin",
        className
      )}
    />
  );
}
