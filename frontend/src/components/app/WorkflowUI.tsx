import type { ReactNode } from "react";
import { Search, X, ArrowRight, Check, Download } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./Btn";
import { money, type Row } from "@/lib/workflow";
export function Status({ children }: { children: ReactNode }) {
  const text = String(children);
  const tone =
    /^(Approved|Verified|Completed|Collected|Active|Published|Ready|Operational|Resolved)/.test(
      text,
    )
      ? "bg-accent text-cobalt"
      : /Rejected|Cancelled|issue/.test(text)
        ? "bg-coral/15 text-destructive"
        : "bg-sun/20 text-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cobalt">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words text-2xl font-bold sm:text-3xl md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="min-w-0 [&>div]:flex-wrap">{actions}</div>}
    </div>
  );
}
export function Metrics({
  items,
}: {
  items: { label: string; value: string | number; note?: string; tone?: string }[];
}) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((m, i) => (
        <article
          key={m.label}
          className="min-w-0 rounded-lg border border-border bg-card p-4 md:p-5"
        >
          <p className="text-xs text-muted-foreground">{m.label}</p>
          <p
            className={`mt-3 break-words font-display text-2xl font-bold ${m.tone || (i === 1 ? "text-cobalt" : "")}`}
          >
            {m.value}
          </p>
          {m.note && <p className="mt-2 text-xs text-muted-foreground">{m.note}</p>}
        </article>
      ))}
    </div>
  );
}
export function Timeline({ steps, active = 0 }: { steps: string[]; active?: number }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s} className="relative flex gap-4 pb-7 last:pb-0">
          <span
            className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs ${i < active ? "bg-cobalt text-cover-foreground" : i === active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {i < active ? <Check className="size-3" /> : i + 1}
          </span>
          {i < steps.length - 1 && (
            <span className="absolute left-3.5 top-7 h-full w-px bg-border" />
          )}
          <span className={`pt-1 text-sm ${i > active ? "text-muted-foreground" : "font-medium"}`}>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}
export type Column = { key: string; label: string };
export function DataTable({
  rows,
  columns,
  search,
  onSearch,
  filter,
  onFilter,
  actions,
  onOpen,
}: {
  rows: Row[];
  columns: Column[];
  search?: string;
  onSearch?: (s: string) => void;
  filter?: string;
  onFilter?: (s: string) => void;
  actions?: (r: Row) => ReactNode;
  onOpen?: (r: Row) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        {onSearch && (
          <label className="flex h-11 min-w-0 sm:max-w-sm flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              aria-label="Search records"
              placeholder="Search name or reference…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        )}
        {onFilter && (
          <select
            aria-label="Filter status"
            value={filter}
            onChange={(e) => onFilter(e.target.value)}
            className="h-11 min-w-0 rounded-lg border border-border bg-card px-3 text-sm"
          >
            {["All statuses", ...new Set(rows.map((r) => r.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="record-table w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium">
                  {c.label}
                </th>
              ))}
              {(actions || onOpen) && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows
              .filter(
                (r) =>
                  (!search ||
                    Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase())) &&
                  (!filter || filter === "All statuses" || r.status === filter),
              )
              .map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/40">
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      data-label={c.label}
                      className={`px-4 py-4 ${i === 0 ? "font-medium" : ""}`}
                    >
                      <div className="min-w-0 break-words">
                        {c.key === "status" || c.key === "stage" ? (
                          <Status>{r[c.key]}</Status>
                        ) : ["amount", "paid"].includes(c.key) ? (
                          money(r[c.key] || 0)
                        ) : (
                          r[c.key] || "—"
                        )}
                      </div>
                    </td>
                  ))}
                  {(actions || onOpen) && (
                    <td data-label="Actions" className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {actions?.(r)}
                        {onOpen && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Open ${r.id}`}
                            onClick={() => onOpen(r)}
                          >
                            <ArrowRight className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
        {rows.filter(
          (r) =>
            (!search || Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase())) &&
            (!filter || filter === "All statuses" || r.status === filter),
        ).length === 0 && (
          <p className="bg-card p-8 text-center text-sm text-muted-foreground">
            No matching records.
          </p>
        )}
      </div>
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-background p-4 sm:p-6 shadow-soft"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <Dialog.Title className="min-w-0 break-words font-display text-xl font-bold">
              {title}
            </Dialog.Title>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function SelectField({
  label,
  name,
  options,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  name?: string;
  options: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (s: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
export function exportRows(rows: Row[], name: string) {
  const keys = Object.keys(rows[0] || { id: "" });
  const csv = [keys, ...rows.map((r) => keys.map((k) => r[k]))]
    .map((r) => r.map((v) => `"${String(v || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `qurbanios-${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
export function ExportButton({ rows, name }: { rows: Row[]; name: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => exportRows(rows, name)}>
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}
