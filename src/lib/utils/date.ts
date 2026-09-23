/**
 * A short, stable day label — "8 Sep".
 *
 * Deliberately absolute rather than "2 hours ago". A relative label is computed
 * from `Date.now()`, which differs between the server render and the hydrating
 * client, and React reports that as a hydration mismatch. Pinning both the
 * locale and the timezone makes the string a pure function of the timestamp,
 * so both passes agree.
 */
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DAY.format(date);
}

/* ---------------------------------------------------------------------------
   Timezone maths for the posting schedule.

   A posting schedule stores an IANA zone and wall-clock times; a scheduled post
   stores a UTC instant. Everything the user sees is the former and everything
   the API is sent is the latter, so these conversions sit between the two.

   They are built on `Intl.DateTimeFormat` rather than a date library because
   that is the only zone database the browser is guaranteed to have, and the
   app ships no date dependency.
--------------------------------------------------------------------------- */

/**
 * Every zone the runtime knows, for the schedule's dropdown.
 *
 * `Intl.supportedValuesOf` is ES2022 and universally supported in the browsers
 * this app targets, but it is absent from older TS lib definitions and from
 * some server runtimes — hence the guard and the one-entry fallback. A
 * hand-maintained list is the thing being avoided: it goes stale, and it is
 * wrong for exactly the users whose zone was left out.
 */
export const TIMEZONES: readonly string[] = (() => {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  try {
    const zones = supported?.("timeZone");
    if (zones?.length) return zones;
  } catch {
    // fall through
  }
  return ["UTC"];
})();

/** The viewer's own zone, as a sensible default when nothing is stored yet. */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = PART_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    PART_FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAY_TO_ISO: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** `0 = Monday … 6 = Sunday`, matching the API's slot days. */
  isoDay: number;
}

/** Break an instant into wall-clock fields in `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // `hour12: false` yields "24" for midnight in some ICU versions.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
    isoDay: WEEKDAY_TO_ISO[weekday] ?? 0,
  };
}

/** How far `timeZone` runs ahead of UTC at the given instant, in ms. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = zonedParts(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * A UTC instant as the `YYYY-MM-DDTHH:mm` an `<input type="datetime-local">`
 * wants, read in `timeZone` rather than the browser's own zone.
 */
export function toLocalInputValue(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * The inverse: a wall-clock `YYYY-MM-DDTHH:mm` in `timeZone` as a UTC ISO
 * string for the API.
 *
 * The offset is applied twice on purpose. The first pass uses the offset at the
 * *guessed* instant, which is the wrong side of a DST transition for times
 * within an hour of one; the second re-reads the offset at the corrected
 * instant and settles it.
 */
export function fromLocalInputValue(
  value: string,
  timeZone: string,
): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = guess - zoneOffsetMs(guess, timeZone);
  const settled = guess - zoneOffsetMs(firstPass, timeZone);
  const date = new Date(settled);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const ZONED_LABELS = new Map<string, Intl.DateTimeFormat>();

/** "Tue 23 Sep, 13:30" — an instant, spelled in `timeZone`. */
export function formatInZone(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  let formatter = ZONED_LABELS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    ZONED_LABELS.set(timeZone, formatter);
  }
  return formatter.format(date);
}

/** Whether a UTC ISO instant has already passed. */
export function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}
