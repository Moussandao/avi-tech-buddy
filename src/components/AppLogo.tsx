import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <img
      src="/icon-192.png"
      alt="AviTech"
      width={40}
      height={40}
      className={cn("size-9 shrink-0 rounded-xl shadow-md ring-1 ring-border", className)}
    />
  );
}
