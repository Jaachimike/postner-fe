"use client";

import { LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/feedback";
import { useMe, useLogout } from "@/features/auth/hooks";

/**
 * Who is signed in, and the way out.
 *
 * Flat rather than a dropdown: there is exactly one action behind it, and a
 * menu that holds a single item is a click spent to learn nothing.
 */
export function AccountMenu() {
  const me = useMe();
  const logout = useLogout();

  if (me.isPending) {
    return (
      <div className="flex items-center gap-2.5 px-1 py-1.5">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
    );
  }

  // `/auth/me` failing means the cookie is stale or the API is down. Neither is
  // worth an error card in the corner of every screen — but sign-out has to
  // stay reachable, since it is what clears the bad cookie.
  const name = me.data?.name?.trim() || me.data?.email || "Signed in";
  const email = me.data?.email;

  return (
    <div className="flex items-center gap-2.5 px-1 py-1.5">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-ink"
      >
        {name.charAt(0).toUpperCase()}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">{name}</span>
        {email && email !== name ? (
          <span className="truncate text-xs text-ink-subtle">{email}</span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Sign out"
        className="shrink-0 rounded-lg p-2 text-ink-subtle transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}
