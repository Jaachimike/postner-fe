"use client";

import * as React from "react";
import { Accordion } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
   A settings ledger.

   A list of `label — current answer` lines you read in one pass, rather than a
   column of empty inputs you have to interrogate one at a time. Rows carry no
   border or fill of their own; the hairlines between them are the only
   structure, so the list stays quieter than whatever sits above it.

   Two kinds of row:

   - `LedgerRow` — the answer *is* the control (a select, a switch). Nothing to
     open; the whole thing fits on the line.
   - `LedgerDisclosure` — too many options to fit, so the line shows the answer
     and opens to the picker. One open at a time: the value of the list is that
     it can be read at a glance, and three open panels destroy that.

   The disclosure rows are Radix `Accordion` items, so the ledger is an
   `Accordion.Root` and takes the open row's id as `value`. Rows of the first
   kind sit inside it untouched — Radix only claims the elements it renders.
--------------------------------------------------------------------------- */

export function Ledger({
  children,
  value,
  onValueChange,
  className,
}: {
  children: React.ReactNode;
  /** Id of the open disclosure row, or "" for none. */
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Accordion.Root
      type="single"
      collapsible
      value={value}
      onValueChange={onValueChange}
      className={cn("divide-y divide-border border-y border-border", className)}
    >
      {children}
    </Accordion.Root>
  );
}

const rowStyles = "flex min-h-13 items-center justify-between gap-4 py-2";

/** A row whose control is small enough to live on the line itself. */
export function LedgerRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  /** Set when the control is a single labelable element, so the row is its label. */
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className={cn(rowStyles, "px-1")}>
      <Label
        htmlFor={htmlFor}
        className={cn("min-w-0", htmlFor && "cursor-pointer")}
      >
        <span className="block text-sm text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-ink-subtle">{hint}</span>
        ) : null}
      </Label>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * A row that shows its answer and opens to the picker behind it.
 *
 * `answer` is the whole point: it has to say what is currently chosen well
 * enough that opening the row is optional. A row that reads "Choose…" has
 * failed and should be a plain field instead.
 */
export function LedgerDisclosure({
  id,
  label,
  answer,
  children,
}: {
  id: string;
  label: string;
  answer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Accordion.Item value={id}>
      <Accordion.Header className="flex">
        <Accordion.Trigger
          className={cn(
            rowStyles,
            "group w-full rounded-lg px-1 text-left transition-colors hover:bg-ink/3",
          )}
        >
          <span className="text-sm text-ink">{label}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-ink-muted">
              {answer}
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-ink-subtle transition-transform duration-200",
                "group-data-[state=open]:rotate-180",
              )}
            />
          </span>
        </Accordion.Trigger>
      </Accordion.Header>

      {/* Radix measures the panel and publishes its height as a CSS variable;
          animating to it is what keeps opening a row from snapping every row
          below it down the page. */}
      <Accordion.Content
        className={cn(
          "overflow-hidden",
          "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
        )}
      >
        <div className="flex flex-col gap-3 px-1 pb-4 pt-1">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
