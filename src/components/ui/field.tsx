"use client";

import * as React from "react";
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

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(baseControl, "h-11 cursor-pointer appearance-none pr-9", className)}
      {...props}
    />
  );
}
