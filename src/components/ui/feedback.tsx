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
  icon: Icon,
  variant = "boxed",
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  /** Optional mark above the title. Sized and coloured here, not by the caller. */
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * `boxed` — a dashed card sitting in the flow of a page that has other
   * content. `bare` — the whole screen has nothing on it, so the message
   * centres in the space instead of drawing a container around itself.
   */
  variant?: "boxed" | "bare";
}) {
  const bare = variant === "bare";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        bare
          ? "min-h-0 flex-1 justify-center px-6 py-16"
          : "rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12",
      )}
    >
      {Icon ? (
        <Icon className={cn("text-ink-subtle", bare ? "size-10" : "size-6")} />
      ) : null}
      <h2
        className={cn(
          "font-semibold text-ink",
          bare ? "text-lg" : "text-base",
        )}
      >
        {title}
      </h2>
      <p className="max-w-sm text-sm text-ink-muted">{body}</p>
      {action ? <div className="flex flex-wrap justify-center gap-2 pt-1">{action}</div> : null}
    </div>
  );
}
