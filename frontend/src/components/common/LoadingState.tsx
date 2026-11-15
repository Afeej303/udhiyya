import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 p-8">
      <Loader2 className="size-8 animate-spin text-cobalt" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
