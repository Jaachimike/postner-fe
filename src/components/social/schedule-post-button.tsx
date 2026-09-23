"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchedulePostSheet } from "@/components/social/schedule-post-sheet";
import { cn } from "@/lib/utils/cn";
import { schedulingBlockedReason, type Post } from "@/lib/api/types";

/**
 * The **Schedule** call to action, in the two places it appears.
 *
 * `overlay` — a round button floating on a grid tile, beside Download.
 * `button` — a normal button on the post detail bar.
 *
 * The sheet's open state lives here so neither caller has to carry it, the same
 * arrangement `DownloadApprovedButton` uses next door.
 */
export function SchedulePostButton({
  post,
  variant = "button",
  className,
}: {
  post: Post;
  variant?: "button" | "overlay";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const blocked = schedulingBlockedReason(post);

  function onClick(event: React.MouseEvent) {
    // On a tile this sits inside the card's link; without this the click
    // navigates to the post instead of opening the sheet.
    event.preventDefault();
    event.stopPropagation();
    if (!blocked) setOpen(true);
  }

  return (
    <>
      {variant === "overlay" ? (
        <button
          type="button"
          onClick={onClick}
          disabled={Boolean(blocked)}
          aria-label="Schedule"
          title={blocked ?? "Schedule"}
          className={cn(
            "grid size-10 place-items-center rounded-full border border-border bg-surface",
            "text-ink shadow-sm transition-colors hover:border-ink/30",
            "disabled:cursor-not-allowed disabled:opacity-40",
            className,
          )}
        >
          <CalendarClock className="size-4" aria-hidden strokeWidth={2.25} />
        </button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={onClick}
          disabled={Boolean(blocked)}
          title={blocked ?? undefined}
          className={className}
        >
          <CalendarClock className="size-4" aria-hidden />
          Schedule
        </Button>
      )}

      {open ? <SchedulePostSheet post={post} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
