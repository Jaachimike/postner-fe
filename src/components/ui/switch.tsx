"use client";

import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export function Toggle({
  id,
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-subtle">{hint}</span> : null}
      </label>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-ink" : "bg-border",
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block size-5 translate-x-0.5 rounded-full bg-surface shadow-sm",
            "transition-transform duration-150 will-change-transform",
            "data-[state=checked]:translate-x-[1.375rem]",
          )}
        />
      </RadixSwitch.Root>
    </div>
  );
}
