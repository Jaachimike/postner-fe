"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBrands } from "@/features/brands/hooks";
import { usePosts } from "@/features/posts/hooks";
import type { Post } from "@/lib/api/types";

/* ---------------------------------------------------------------------------
   Dismissal.

   Held in localStorage and read through `useSyncExternalStore` rather than an
   effect. Two reasons: the React Compiler lint rules reject `setState` in an
   effect body (see AGENTS.md), and the server snapshot gives React an explicit
   hydration value instead of a first paint that contradicts storage.
--------------------------------------------------------------------------- */
const DISMISS_KEY = "postner.setup-dismissed";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // `storage` only fires in *other* tabs, so dismissing in one tab clears the
  // card in the rest. Same-tab updates go through `listeners`.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Private mode and blocked site data both throw on access. Showing the
    // card is the harmless failure.
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

function dismiss() {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* Nothing to persist to; the card still closes for this render. */
  }
  listeners.forEach((notify) => notify());
}

/* ------------------------------------------------------------------------ */

interface Step {
  label: string;
  href: string;
  done: boolean;
}

/**
 * First-run progress, derived from live data rather than stored.
 *
 * Every step is a fact about the account that the API already answers, so
 * there is no separate onboarding state to write, migrate, or get out of sync
 * with reality — deleting your only brand correctly reopens step one.
 */
export function SetupChecklist({ onNavigate }: { onNavigate?: () => void }) {
  const dismissed = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const brands = useBrands();
  const posts = usePosts();

  // Wait for both before drawing a bar; "0 of 3" flashing on every load reads
  // as a fresh account to someone who is not one.
  if (dismissed || brands.isPending || posts.isPending) return null;

  const allPosts: Post[] = posts.data ?? [];
  const steps: Step[] = [
    {
      label: "Create a brand",
      href: "/brands",
      done: (brands.data?.length ?? 0) > 0,
    },
    {
      label: "Draft your first post",
      href: "/posts/new",
      done: allPosts.length > 0,
    },
    {
      label: "Approve a post",
      href: "/review",
      done: allPosts.some((post) => post.status === "approved"),
    },
  ];

  const complete = steps.filter((step) => step.done).length;
  if (complete === steps.length) return null;

  // The first unfinished step is the one being asked for; it gets the emphasis.
  const currentIndex = steps.findIndex((step) => !step.done);

  return (
    <section
      aria-label="Setup progress"
      className="rounded-2xl border border-border bg-bg/60 p-3.5"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Setup</h2>
        <span className="ml-auto text-xs text-ink-subtle">
          {complete} of {steps.length}
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss setup checklist"
          className="-mr-1 rounded-md p-1 text-ink-subtle transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <div
        role="progressbar"
        aria-valuenow={complete}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-label={`${complete} of ${steps.length} steps done`}
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out-soft"
          style={{ width: `${(complete / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-3 flex flex-col gap-0.5">
        {steps.map((step, index) => (
          <li key={step.href}>
            <Link
              href={step.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm transition-colors",
                "hover:bg-ink/5",
                step.done && "text-ink-subtle",
                !step.done && index === currentIndex && "font-medium text-ink",
                !step.done && index !== currentIndex && "text-ink-subtle",
              )}
            >
              <StepMark done={step.done} />
              <span className={cn("min-w-0 truncate", step.done && "line-through")}>
                {step.label}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepMark({ done }: { done: boolean }) {
  return done ? (
    <span
      aria-hidden
      className="grid size-4 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"
    >
      <Check className="size-2.5" strokeWidth={3.5} />
    </span>
  ) : (
    <span
      aria-hidden
      className="size-4 shrink-0 rounded-full border-2 border-ink/20"
    />
  );
}
