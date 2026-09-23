"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ErrorNote, Skeleton } from "@/components/ui/feedback";
import { useCompleteConnection, useMetaPages } from "@/features/social/hooks";
import { toMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import { PLATFORM_META, type MetaPage, type Platform } from "@/lib/api/types";

/**
 * Pick which Facebook Page this brand posts as.
 *
 * Reached on the way back from Meta: the API parks the Pages it fetched against
 * a single-use nonce and redirects here with it. Nothing is stored until a Page
 * is chosen, so closing this without choosing leaves no connection behind — and
 * spends the nonce, so the flow has to be restarted rather than resumed.
 */
export function PagePickerSheet({
  brandId,
  nonce,
  platform,
  onClose,
  onConnected,
}: {
  brandId: string;
  nonce: string;
  platform: Platform;
  onClose: () => void;
  onConnected: () => void;
}) {
  const pages = useMetaPages(brandId, nonce);
  const complete = useCompleteConnection(brandId);
  const [selected, setSelected] = React.useState<string | null>(null);

  const needsInstagram = platform === "instagram";
  const eligible = (page: MetaPage) =>
    !needsInstagram || Boolean(page.instagram_business_account_id);

  return (
    <Sheet
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Connect ${PLATFORM_META[platform].label}`}
      description={
        needsInstagram
          ? "Pick the Page whose linked Instagram account this brand posts to."
          : "Pick the Page this brand posts to."
      }
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={complete.isPending}
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              complete.mutate(
                { platform, nonce, page_id: selected },
                { onSuccess: onConnected },
              );
            }}
          >
            Connect
          </Button>
        </>
      }
    >
      {pages.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : pages.isError ? (
        <div className="flex flex-col gap-3">
          <ErrorNote message={toMessage(pages.error)} />
          <p className="text-sm text-ink-muted">
            Sign-in sessions are single-use and short-lived. Close this and press
            Connect again to start over.
          </p>
        </div>
      ) : pages.data.pages.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          That account manages no Facebook Pages. Create one, then connect again.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.data.pages.map((page) => {
            const usable = eligible(page);
            const isSelected = selected === page.id;
            return (
              <li key={page.id}>
                <button
                  type="button"
                  disabled={!usable || complete.isPending}
                  onClick={() => setSelected(page.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                    "transition-[background-color,border-color] duration-150",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isSelected
                      ? "border-ink bg-ink/[0.04]"
                      : "border-border bg-surface hover:border-ink/25",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{page.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-subtle">
                      {needsInstagram
                        ? page.instagram_username
                          ? `@${page.instagram_username}`
                          : "No Instagram business account linked to this Page"
                        : `Page ID ${page.id}`}
                    </p>
                  </div>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-ink" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ErrorNote
        className="mt-3"
        message={complete.error ? toMessage(complete.error) : null}
      />
    </Sheet>
  );
}
