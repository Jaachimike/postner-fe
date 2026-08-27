"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-4 animate-spin text-ink-subtle", className)}
      aria-hidden
    />
  );
}

export function ErrorNote({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-reject/25 bg-reject/5 px-3.5 py-2.5",
        "text-sm text-ink",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-reject" aria-hidden />
      <span className="min-w-0">{message}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-ink/[0.07]", className)}
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="max-w-sm text-sm text-ink-muted">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
