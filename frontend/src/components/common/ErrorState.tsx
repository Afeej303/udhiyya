import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "../app/Btn";

export function ErrorState({
  title = "Something went wrong",
  message = "Unable to fetch data from the server. Please check your connection or retry.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive mb-3">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
          <RotateCcw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
