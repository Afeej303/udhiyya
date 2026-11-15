import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Button } from "../app/Btn";

export function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "Get started by creating a new entry or clearing your search filters.",
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mb-3">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant="pop" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
