import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5 lift", className)} {...p} />;
}
export function PageHead({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div><h1 className="text-3xl font-bold md:text-4xl">{title}</h1><p className="mt-1 text-muted-foreground">{sub}</p></div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
export function Stat({ label, value, delta, tone, i = 0 }: { label: string; value: string; delta: number; tone: string; i?: number }) {
  const up = delta >= 0;
  return (
    <Card className="relative overflow-hidden animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
      <span className={cn("absolute -right-6 -top-6 size-20 rounded-full opacity-60", tone)} />
      <p className="relative pr-10 text-sm text-muted-foreground">{label}</p>
      <p className="relative mt-2 font-display text-3xl font-bold">{value}</p>
      <span className={cn("relative mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", up ? "bg-accent text-foreground" : "bg-coral/20 text-foreground")}>
        {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(delta)}% vs last month
      </span>
    </Card>
  );
}
const tones: Record<string, string> = { Active: "bg-lime", Trial: "bg-sun", "Past due": "bg-coral", Churned: "bg-muted-foreground/30" };
export function Pill({ s }: { s: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium"><span className={cn("size-1.5 rounded-full", tones[s] ?? "bg-cobalt")} />{s}</span>;
}
export function Avatar({ name }: { name: string }) {
  const c = ["bg-lime", "bg-coral", "bg-sun", "bg-cobalt"][[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 4];
  return <span className={cn("grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink text-xs font-bold text-ink", c)}>{name.split(" ").map((n) => n[0]).join("")}</span>;
}
export const tip = { contentStyle: { borderRadius: 12, border: "2px solid var(--ink)", background: "var(--card)", fontSize: 12 } };
