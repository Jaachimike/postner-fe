"use client";

import { Check, Loader2, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNote, Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";
import type { PipelineStep, StepState } from "@/features/posts/use-pipeline";

export function Generating({
  steps,
  error,
  onRetry,
}: {
  steps: PipelineStep[];
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[32rem] flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Creating your post…
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Rendering the design takes a moment. You can leave this page and come
          back — nothing is lost.
        </p>
      </div>

      {/* Skeleton of the card that is about to appear, not a bare spinner. */}
      <div className="w-full rounded-card bg-card p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full bg-card-elevated" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-28 bg-card-elevated" />
            <Skeleton className="h-3 w-20 bg-card-elevated" />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-3 w-full bg-card-elevated" />
          <Skeleton className="h-3 w-11/12 bg-card-elevated" />
          <Skeleton className="h-3 w-4/5 bg-card-elevated" />
        </div>
        <Skeleton className="mt-4 aspect-[4/5] w-full rounded-xl bg-card-elevated" />
      </div>

      <ol className="flex w-full flex-col gap-1">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            aria-live={step.state === "running" ? "polite" : undefined}
          >
            <StepIcon state={step.state} />
            <span
              className={cn(
                "text-sm",
                step.state === "done" || step.state === "running"
                  ? "text-ink"
                  : "text-ink-subtle",
              )}
            >
              {step.label}
            </span>
            {step.state === "skipped" ? (
              <span className="ml-auto text-xs text-ink-subtle">not needed</span>
            ) : null}
          </li>
        ))}
      </ol>

      {error ? (
        <div className="flex w-full flex-col gap-3">
          <ErrorNote message={error} />
          <Button variant="secondary" onClick={onRetry} className="self-start">
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const base = "grid size-6 shrink-0 place-items-center rounded-full";
  if (state === "done") {
    return (
      <span className={cn(base, "bg-accent text-accent-ink")}>
        <Check className="size-3.5" aria-hidden strokeWidth={3} />
      </span>
    );
  }
  if (state === "running") {
    return (
      <span className={cn(base, "bg-ink text-bg")}>
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className={cn(base, "bg-reject text-white")}>
        <X className="size-3.5" aria-hidden strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className={cn(base, "border border-border text-ink-subtle")}>
      <Minus className="size-3" aria-hidden />
    </span>
  );
}
