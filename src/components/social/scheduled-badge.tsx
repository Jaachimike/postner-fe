"use client";

import { cn } from "@/lib/utils/cn";
import { formatDay } from "@/lib/utils/date";
import { SCHEDULED_STATUS_META, type ScheduledPost } from "@/lib/api/types";

/**
 * Where a post is in the publish queue, in one phrase.
 *
 * Mirrors the tile's `StageBadge` — same dot, same tone tokens — because the
 * two sit on the same card and describe consecutive halves of the same life:
 * what the post is, then where it is going.
 *
 * The timestamp is `formatDay`, not the connection's timezone: a grid shows
 * posts from several brands and accounts at once, and mixing zones silently in
 * a list of dates is worse than being a day-grain label. The exact local time
 * is in the Schedule sheet, where the zone is stated.
 */
export function ScheduledBadge({
  scheduled,
  className,
}: {
  scheduled: ScheduledPost;
  className?: string;
}) {
  const meta = SCHEDULED_STATUS_META[scheduled.status];
  if (!meta) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border",
        "bg-surface/95 px-2.5 py-1 text-xs text-ink-muted shadow-sm",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.tone)} aria-hidden />
      {meta.label}
      {scheduled.scheduled_at ? (
        <span className="tabular-nums text-ink-subtle">
          {formatDay(scheduled.scheduled_at)}
        </span>
      ) : null}
    </span>
  );
}
