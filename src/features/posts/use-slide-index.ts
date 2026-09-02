"use client";

import * as React from "react";

/**
 * The active carousel slide, reset when the post changes.
 *
 * The conditional `setState` during render is deliberate and is the pattern
 * React documents for "storing information from previous renders" — the
 * `react-hooks/set-state-in-render` rule names it in its own error text. Both
 * that rule and `set-state-in-effect` are errors in this project, so the
 * obvious alternatives (an effect, or an unconditional set) do not compile past
 * lint. A `key` on the card would also work, but only while the state lives
 * there; this survives the state being lifted to drive the review sheets.
 *
 * `index` is clamped on read rather than on write so that a post which briefly
 * loses pages mid-edit does not permanently forget where you were.
 */
export function useSlideIndex(resetKey: string, count: number) {
  const [index, setIndex] = React.useState(0);
  const [seenKey, setSeenKey] = React.useState(resetKey);

  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setIndex(0);
  }

  const last = Math.max(count - 1, 0);

  return {
    index: Math.min(index, last),
    setIndex: (next: number) => setIndex(Math.max(0, Math.min(next, last))),
  };
}
