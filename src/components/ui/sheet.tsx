"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Bottom sheet on mobile, centred modal on desktop — the layout the FE spec
 * calls for on the reject / edit / download surfaces.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-surface shadow-2xl shadow-ink/20 outline-none",
            // mobile: bottom sheet
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl",
            // desktop: centred modal
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(30rem,calc(100vw-3rem))]",
            "sm:max-h-[85dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-ink">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mr-1 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
            {children}
          </div>

          {footer ? (
            <div className="flex gap-2 border-t border-border px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-5">
              {footer}
            </div>
          ) : (
            <div className="pb-[env(safe-area-inset-bottom)]" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
