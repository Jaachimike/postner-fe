"use client";

import { CornerUpRight, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * The three review actions, styled as outlined circles per
 * docs/review-screen-reference.png. Never collapse these behind an overflow
 * menu — they are the whole interaction.
 */
export function FabRow({
  onReject,
  onEdit,
  onApprove,
  disabled,
  className,
}: {
  onReject: () => void;
  onEdit: () => void;
  onApprove: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Review actions"
      className={cn("flex items-center justify-center gap-6", className)}
    >
      <Fab label="Reject" tone="reject" onClick={onReject} disabled={disabled}>
        <X className="size-6" aria-hidden strokeWidth={2.25} />
      </Fab>
      <Fab label="Edit" tone="edit" onClick={onEdit} disabled={disabled}>
        <Pencil className="size-5" aria-hidden strokeWidth={2.25} />
      </Fab>
      <Fab label="Approve" tone="approve" onClick={onApprove} disabled={disabled}>
        <CornerUpRight className="size-6" aria-hidden strokeWidth={2.25} />
      </Fab>
    </div>
  );
}

const TONES = {
  reject: "border-reject/45 text-reject hover:border-reject hover:bg-reject/10",
  edit: "border-edit/45 text-edit hover:border-edit hover:bg-edit/10",
  approve: "border-approve/45 text-approve hover:border-approve hover:bg-approve/10",
} as const;

function Fab({
  label,
  tone,
  onClick,
  disabled,
  children,
}: {
  label: string;
  tone: keyof typeof TONES;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-14 place-items-center rounded-full border-2 bg-surface",
        "transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out-soft)]",
        "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        TONES[tone],
      )}
    >
      {children}
    </button>
  );
}
