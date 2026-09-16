"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 text-sm font-medium text-ink"
      >
        {label}
        {optional ? (
          <span className="text-xs font-normal text-ink-subtle">Optional</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-reject">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

const baseControl =
  "w-full rounded-xl border bg-surface px-3.5 text-sm text-ink placeholder:text-ink-subtle " +
  "transition-colors outline-none focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/10 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-reject";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(baseControl, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(baseControl, "min-h-24 resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

/**
 * `control` — the boxed field used inside a `Field`.
 * `bare` — no border or fill, sized to its content and right-aligned. For a
 *   settings row that reads as a sentence rather than a form, where a full-width
 *   box would be the loudest thing on a line that is meant to be quiet.
 *
 * The chevron is drawn here rather than left to the platform: `appearance-none`
 * removes the native one, and every caller reserved space for a replacement
 * that nothing was rendering.
 */
export function Select({
  className,
  variant = "control",
  ...props
}: React.ComponentProps<"select"> & { variant?: "control" | "bare" }) {
  const bare = variant === "bare";
  return (
    <div className={cn("relative", bare ? "inline-flex" : "block")}>
      <select
        className={cn(
          "cursor-pointer appearance-none outline-none transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          bare
            ? "max-w-48 truncate rounded-lg bg-transparent py-1 pl-2 pr-7 text-right text-sm font-medium text-ink hover:bg-ink/5"
            : cn(baseControl, "h-11 pr-9"),
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-subtle",
          bare ? "right-1.5 size-3.5" : "right-3.5 size-4",
        )}
      />
    </div>
  );
}
