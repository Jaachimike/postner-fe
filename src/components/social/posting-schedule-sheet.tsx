"use client";

import * as React from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ErrorNote, Skeleton } from "@/components/ui/feedback";
import {
  usePostingSchedule,
  useResetPostingSchedule,
  useSavePostingSchedule,
} from "@/features/social/hooks";
import { toMessage } from "@/lib/api/errors";
import { TIMEZONES } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import {
  DAY_LABELS,
  DAY_NAMES,
  SLOT_TIME_RE,
  platformLabel,
  postsPerWeek,
  type Connection,
  type ScheduleSlot,
} from "@/lib/api/types";

/**
 * The weekly times this account posts at.
 *
 * Owned per connection, not per brand: an agency running one brand's Instagram
 * and Facebook will want different cadences on each, and the API models it that
 * way too.
 */
export function PostingScheduleSheet({
  brandId,
  connection,
  onClose,
}: {
  brandId: string;
  connection: Connection;
  onClose: () => void;
}) {
  const schedule = usePostingSchedule(brandId, connection.id);

  return (
    <Sheet
      open
      onOpenChange={(next) => !next && onClose()}
      title="Posting schedule"
      description="Posts auto-schedule to the next available slot. You can override per post."
      className="sm:w-[min(34rem,calc(100vw-3rem))]"
    >
      <div className="flex items-center gap-2 pb-4 text-sm">
        <span className="font-medium text-ink">{connection.display_name}</span>
        <span className="text-ink-subtle">·</span>
        <span className="text-ink-muted">{platformLabel(connection.platform)}</span>
      </div>

      {schedule.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-11" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : schedule.isError ? (
        <ErrorNote message={toMessage(schedule.error)} />
      ) : (
        /**
         * Remounted whenever the server's copy changes, which reseeds the form
         * from it. A `setState` in an effect would be the obvious alternative
         * and the compiler lint rejects it — correctly, since the two copies
         * would then briefly disagree on every save and reset.
         */
        <ScheduleForm
          key={schedule.data.updated_at ?? schedule.data.id}
          brandId={brandId}
          connectionId={connection.id}
          timezone={schedule.data.timezone}
          slots={schedule.data.slots}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function ScheduleForm({
  brandId,
  connectionId,
  timezone: initialTimezone,
  slots: initialSlots,
  onClose,
}: {
  brandId: string;
  connectionId: string;
  timezone: string;
  slots: ScheduleSlot[];
  onClose: () => void;
}) {
  const save = useSavePostingSchedule(brandId, connectionId);
  const reset = useResetPostingSchedule(brandId, connectionId);

  const [timezone, setTimezone] = React.useState(initialTimezone || "UTC");
  const [slots, setSlots] = React.useState<ScheduleSlot[]>(
    initialSlots.length > 0 ? initialSlots : [{ time: "13:30", days: [0, 1, 2, 3, 4] }],
  );
  const [invalid, setInvalid] = React.useState<string | null>(null);

  const perWeek = postsPerWeek(slots);
  const busy = save.isPending || reset.isPending;

  function patchSlot(index: number, patch: Partial<ScheduleSlot>) {
    setSlots((current) =>
      current.map((slot, position) =>
        position === index ? { ...slot, ...patch } : slot,
      ),
    );
    setInvalid(null);
  }

  function toggleDay(index: number, day: number) {
    const slot = slots[index];
    const days = slot.days.includes(day)
      ? slot.days.filter((value) => value !== day)
      : [...slot.days, day].sort((a, b) => a - b);
    patchSlot(index, { days });
  }

  function submit() {
    const problem = validate(slots);
    if (problem) {
      setInvalid(problem);
      return;
    }
    save.mutate(
      { timezone, slots: slots.map((slot) => ({ ...slot, days: [...slot.days].sort((a, b) => a - b) })) },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Timezone"
        htmlFor="schedule-timezone"
        hint="Slot times are wall-clock times in this zone."
      >
        <Select
          id="schedule-timezone"
          value={timezone}
          disabled={busy}
          onChange={(event) => setTimezone(event.target.value)}
        >
          {TIMEZONES.includes(timezone) ? null : (
            <option value={timezone}>{timezone}</option>
          )}
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        {slots.map((slot, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-xl border border-border bg-bg/40 p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                type="time"
                aria-label={`Time for row ${index + 1}`}
                value={slot.time}
                disabled={busy}
                onChange={(event) => patchSlot(index, { time: event.target.value })}
                className="h-10 w-32"
              />
              <span className="text-xs text-ink-subtle">
                {slot.days.length} {slot.days.length === 1 ? "day" : "days"}
              </span>
              <button
                type="button"
                disabled={busy || slots.length === 1}
                onClick={() =>
                  setSlots((current) => current.filter((_, position) => position !== index))
                }
                aria-label={`Remove the ${slot.time} row`}
                className={cn(
                  "ml-auto rounded-lg p-2 text-ink-subtle transition-colors",
                  "hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>

            <div role="group" aria-label={`Days for ${slot.time}`} className="flex gap-1.5">
              {DAY_LABELS.map((label, day) => {
                const selected = slot.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={DAY_NAMES[day]}
                    disabled={busy}
                    onClick={() => toggleDay(index, day)}
                    className={cn(
                      "size-9 shrink-0 rounded-lg border text-sm font-medium",
                      "transition-[background-color,border-color,color] duration-150",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      selected
                        ? "border-ink bg-ink text-bg"
                        : "border-border bg-surface text-ink-subtle hover:border-ink/30 hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            setSlots((current) => [...current, { time: "09:00", days: [0, 1, 2, 3, 4] }]);
            setInvalid(null);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add time
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={reset.isPending}
          disabled={busy}
          onClick={() => reset.mutate()}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset to defaults
        </Button>
        <span className="ml-auto text-sm tabular-nums text-ink-muted">
          {perWeek} posts / week
        </span>
      </div>

      <ErrorNote message={invalid ?? (save.error || reset.error ? toMessage(save.error ?? reset.error) : null)} />

      <div className="flex gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="button" className="flex-1" loading={save.isPending} onClick={submit}>
          Save schedule
        </Button>
      </div>
    </div>
  );
}

/**
 * What the API would reject, said on this side of the request.
 *
 * The server check is the real one; this exists so a bad row is named rather
 * than arriving as a sheet-level 422 about `slots.2.days`.
 */
function validate(slots: ScheduleSlot[]): string | null {
  if (slots.length === 0) return "Add at least one time.";
  for (const slot of slots) {
    if (!SLOT_TIME_RE.test(slot.time)) {
      return `"${slot.time || "empty"}" is not a valid time. Use 24-hour HH:MM.`;
    }
    if (slot.days.length === 0) {
      return `Pick at least one day for ${slot.time}.`;
    }
  }
  const times = slots.map((slot) => slot.time);
  const duplicate = times.find((time, index) => times.indexOf(time) !== index);
  if (duplicate) return `${duplicate} appears twice. Merge the two rows.`;
  return null;
}
