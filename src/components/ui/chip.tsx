"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ChipOption {
  value: string;
  label: string;
  description?: string;
}

export function Chip({
  selected,
  disabled,
  children,
  onClick,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm",
        "transition-[background-color,border-color,color] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-ink bg-ink text-bg"
          : "border-border bg-surface text-ink-muted hover:border-ink/30 hover:text-ink",
        className,
      )}
    >
      {selected ? <Check className="size-3.5" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ChipGroup({
  options,
  value,
  onChange,
  multiple = false,
  ariaLabel,
  className,
}: {
  options: readonly ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  function toggle(option: string) {
    if (!multiple) {
      onChange([option]);
      return;
    }
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          selected={value.includes(option.value)}
          onClick={() => toggle(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
