"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ErrorNote, Skeleton } from "@/components/ui/feedback";
import { useConnections, useNextSlot, useSchedulePost } from "@/features/social/hooks";
import { toMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import {
  browserTimezone,
  fromLocalInputValue,
  isPast,
  toLocalInputValue,
} from "@/lib/utils/date";
import {
  isActiveConnection,
  platformLabel,
  schedulingBlockedReason,
  type Connection,
  type Post,
} from "@/lib/api/types";

/**
 * Schedule an approved post to one or more connected accounts.
 *
 * Multi-account is several rows, not one: the API models a scheduled publish
 * per connection, because Instagram and Facebook are dispatched separately and
 * either can fail on its own. So this sends one request per selected account
 * and reports per account — a single failure should not discard the ones that
 * took.
 */
export function SchedulePostSheet({
  post,
  onClose,
}: {
  post: Post;
  onClose: () => void;
}) {
  const brandId = post.brand_id ?? "";
  const connections = useConnections(brandId);
  const schedule = useSchedulePost();

  const active = (connections.data ?? []).filter(isActiveConnection);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [override, setOverride] = React.useState<string | null>(null);
  const [failures, setFailures] = React.useState<string[]>([]);
  const [timeError, setTimeError] = React.useState<string | null>(null);

  // Exactly one connection is not a choice — preselect it and say so in words.
  const chosen = selected.length === 0 && active.length === 1 ? [active[0].id] : selected;

  // The seed comes from the first chosen account's own weekly schedule. Asking
  // for every selection's next slot would give several answers to a field that
  // holds one, and the brief says one shared time.
  const seedFrom = chosen[0] ?? "";
  const nextSlot = useNextSlot(brandId, seedFrom, { enabled: Boolean(seedFrom) });

  const timezone = nextSlot.data?.timezone || browserTimezone();
  const seeded = toLocalInputValue(nextSlot.data?.scheduled_at, timezone);
  const value = override ?? seeded;

  const blocked = schedulingBlockedReason(post);
  const utc = value ? fromLocalInputValue(value, timezone) : null;

  function toggle(connectionId: string) {
    setSelected((current) => {
      const base = current.length === 0 && active.length === 1 ? [active[0].id] : current;
      return base.includes(connectionId)
        ? base.filter((id) => id !== connectionId)
        : [...base, connectionId];
    });
    setFailures([]);
  }

  async function submit() {
    if (!utc) return;
    // Checked here rather than during render: `Date.now()` is impure, and the
    // React Compiler lint is right that a render must not depend on it. A time
    // that was future when the sheet opened can be past by the time it is sent,
    // so the moment of sending is the honest one to compare against anyway.
    if (isPast(utc)) {
      setTimeError("Pick a time in the future.");
      return;
    }
    setTimeError(null);
    setFailures([]);
    const targets = active.filter((connection) => chosen.includes(connection.id));

    const outcomes = await Promise.allSettled(
      targets.map((connection) =>
        schedule.mutateAsync({
          post_id: post.id,
          platform: connection.platform,
          connection_id: connection.id,
          scheduled_at: utc,
        }),
      ),
    );

    const failed = outcomes.flatMap((outcome, index) =>
      outcome.status === "rejected"
        ? [`${targets[index].display_name}: ${toMessage(outcome.reason)}`]
        : [],
    );
    if (failed.length === 0) {
      onClose();
      return;
    }
    setFailures(failed);
    // Drop the ones that took, so a retry does not double-schedule them.
    setSelected(
      targets
        .filter((_, index) => outcomes[index].status === "rejected")
        .map((connection) => connection.id),
    );
  }

  const canSubmit = !blocked && chosen.length > 0 && Boolean(utc);

  return (
    <Sheet
      open
      onOpenChange={(next) => !next && onClose()}
      title="Schedule Post"
      description={`Times shown in your timezone — ${timezone}`}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={schedule.isPending}
            disabled={!canSubmit}
            onClick={submit}
          >
            <CalendarClock className="size-4" aria-hidden />
            Schedule
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {blocked ? <ErrorNote message={blocked} /> : null}

        {connections.isPending ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : connections.isError ? (
          <ErrorNote message={toMessage(connections.error)} />
        ) : active.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-surface/60 p-4">
            <p className="text-sm text-ink-muted">
              This brand has no connected account yet. Connect Instagram or
              Facebook and its posting schedule is created for you.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/brands/${brandId}/connections`}>Connect an account</Link>
            </Button>
          </div>
        ) : active.length === 1 ? (
          <p className="text-sm text-ink-muted">
            Posting to{" "}
            <span className="font-medium text-ink">
              {platformLabel(active[0].platform)} ({active[0].display_name})
            </span>
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1.5 text-sm font-medium text-ink">Accounts</legend>
            {active.map((connection) => (
              <AccountRow
                key={connection.id}
                connection={connection}
                selected={chosen.includes(connection.id)}
                disabled={schedule.isPending}
                onToggle={() => toggle(connection.id)}
              />
            ))}
          </fieldset>
        )}

        <Field
          label="Date and time"
          htmlFor="schedule-at"
          error={timeError ?? undefined}
          hint={
            nextSlot.isPending && seedFrom
              ? "Finding the next open slot…"
              : "Defaults to the next slot on this account's weekly schedule."
          }
        >
          <Input
            id="schedule-at"
            type="datetime-local"
            value={value}
            disabled={schedule.isPending || active.length === 0}
            aria-invalid={Boolean(timeError)}
            onChange={(event) => {
              setOverride(event.target.value);
              setTimeError(null);
            }}
          />
        </Field>

        {failures.length > 0 ? (
          <div className="flex flex-col gap-2">
            {failures.map((failure) => (
              <ErrorNote key={failure} message={failure} />
            ))}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

function AccountRow({
  connection,
  selected,
  disabled,
  onToggle,
}: {
  connection: Connection;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
        "transition-[background-color,border-color] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-ink bg-ink/[0.04]" : "border-border bg-surface hover:border-ink/25",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border",
          selected ? "border-ink bg-ink text-bg" : "border-border",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3.5" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {connection.display_name}
        </span>
        <span className="block text-xs text-ink-subtle">
          {platformLabel(connection.platform)}
        </span>
      </span>
    </button>
  );
}
