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
