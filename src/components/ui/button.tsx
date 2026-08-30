"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "accent";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-bg hover:bg-ink/90 disabled:bg-ink/40 shadow-sm shadow-ink/10",
  accent:
    "bg-accent text-accent-ink hover:bg-accent/90 disabled:bg-accent/40 font-semibold",
  secondary:
    "bg-surface text-ink border border-border hover:border-ink/25 hover:bg-bg",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-ink/5",
  destructive: "bg-reject text-white hover:bg-reject/90 disabled:bg-reject/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2",
};

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  asChild?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,border-color,color,opacity] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
}
