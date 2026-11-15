import { Link } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
export function Logo({ className, invert }: { className?: string; invert?: boolean }) {
  return (
    <Link
      to="/"
      className={cn("flex shrink-0 items-center gap-2.5 font-display text-xl font-bold", className)}
    >
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Moon className="size-5" strokeWidth={2.5} />
      </span>
      <span className={invert ? "text-ink-foreground" : "text-foreground"}>
        Qurbani<span className="font-normal">OS</span>
        <span className="text-cobalt">.</span>
      </span>
    </Link>
  );
}
