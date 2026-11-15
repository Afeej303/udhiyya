import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const btn = cva(
  "inline-flex max-w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        pop: "border border-primary bg-primary text-primary-foreground hover:bg-primary/85",
        ink: "bg-ink text-ink-foreground hover:bg-ink-soft",
        ghost: "hover:bg-muted text-foreground",
        outline: "border border-border bg-card hover:bg-muted text-foreground",
        coral: "border-2 border-ink bg-coral text-ink shadow-pop press",
      },
      size: { sm: "h-11 sm:h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base" },
    },
    defaultVariants: { variant: "pop", size: "md" },
  },
);
export type BtnProps = VariantProps<typeof btn>;

export function Button({
  className,
  variant,
  size,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & BtnProps) {
  return <button className={cn(btn({ variant, size }), className)} {...p} />;
}
