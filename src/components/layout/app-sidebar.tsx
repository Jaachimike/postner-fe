"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { SetupChecklist } from "@/components/layout/setup-checklist";
import { AccountMenu } from "@/components/layout/account-menu";
import { NAV_ITEMS, activeNavHref } from "@/components/layout/nav-items";
import { usePosts } from "@/features/posts/hooks";
import { hasPreview, isReviewable, type Post } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

/**
 * The persistent rail: make something, work the queue, then the three places
 * finished and in-flight work lives.
 *
 * Rendered twice — fixed on `lg` and up, inside a drawer below it — so it owns
 * no width or positioning of its own. `onNavigate` is how the drawer closes
 * itself when a link is followed; the fixed rail passes nothing.
 */
export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeNavHref(pathname);
  const posts = usePosts();

  /**
   * Same gate as the review queue: a post is reviewable once its design HTML
   * exists, because the PNGs are not rendered until it is approved. Counting
   * anything looser puts a number on the button that the queue then contradicts.
   */
  const waiting = (posts.data ?? []).filter(
    (post: Post) => isReviewable(post) && hasPreview(post),
  ).length;

  const reviewing = pathname.startsWith("/review");

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link
          href="/drafts"
          onClick={onNavigate}
          aria-label="Postner — drafts"
          className="rounded-lg"
        >
          <Logo className="h-5" />
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <div className="flex shrink-0 flex-col gap-2">
          <Button asChild variant="accent" className="w-full">
            <Link href="/posts/new" onClick={onNavigate}>
              <Sparkles className="size-4" aria-hidden />
              New post
            </Link>
          </Button>

          <Button
            asChild
            variant="secondary"
            className={cn("w-full", reviewing && "border-ink/25 bg-bg")}
          >
            <Link
              href="/review"
              onClick={onNavigate}
              aria-current={reviewing ? "page" : undefined}
            >
              <Inbox className="size-4" aria-hidden />
              Review
              {waiting > 0 ? (
                <span className="ml-auto rounded-full bg-ink px-1.5 py-0.5 text-xs font-semibold tabular-nums text-bg">
                  {waiting}
                </span>
              ) : null}
            </Link>
          </Button>
        </div>

        <nav aria-label="Main" className="mt-6 flex shrink-0 flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const current = active === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  current
                    ? "bg-ink/[0.06] font-medium text-ink"
                    : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <SetupChecklist onNavigate={onNavigate} />
          <div className="border-t border-border pt-2">
            <AccountMenu />
          </div>
        </div>
      </div>
    </div>
  );
}
