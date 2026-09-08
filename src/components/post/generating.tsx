"use client";

import { Check, Loader2, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNote, Skeleton } from "@/components/ui/feedback";
import { FitBox } from "@/components/post/media-frame";
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
    // Same height chain as the review surface: everything but the skeleton
    // card is `shrink-0`, so the placeholder gives way and the step list — the
    // only part carrying information — stays on screen without a scroll.
    <div className="mx-auto flex min-h-0 w-full max-w-[32rem] flex-1 flex-col items-center gap-6 py-4">
      <div className="shrink-0 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Creating your post…
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Rendering the design takes a moment. You can leave this page and come
          back — nothing is lost.
        </p>
      </div>

      {/* Skeleton of the card that is about to appear, not a bare spinner. */}
      <div className="flex min-h-0 w-full flex-1 flex-col rounded-card bg-card p-5">
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton className="size-10 rounded-full bg-card-elevated" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-28 bg-card-elevated" />
            <Skeleton className="h-3 w-20 bg-card-elevated" />
          </div>
        </div>
        <div className="mt-4 flex shrink-0 flex-col gap-2">
          <Skeleton className="h-3 w-full bg-card-elevated" />
          <Skeleton className="h-3 w-11/12 bg-card-elevated" />
          <Skeleton className="h-3 w-4/5 bg-card-elevated" />
        </div>
        {/* A low floor: this is a placeholder for a design, not the design, so
            it can shrink much further than the real frame before it is worth
            scrolling for. */}
        <FitBox aspect={4 / 5} minHeight="3rem" className="mt-4">
          <Skeleton className="size-full rounded-xl bg-card-elevated" />
        </FitBox>
      </div>

      <ol className="flex w-full shrink-0 flex-col gap-1">
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
        <div className="flex w-full shrink-0 flex-col gap-3">
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
