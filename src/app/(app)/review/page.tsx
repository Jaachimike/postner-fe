"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ReviewSurface } from "@/components/review/review-surface";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
import { usePosts } from "@/features/posts/hooks";
import { hasPreview, isReviewable, type Post } from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";

/**
 * The review queue.
 *
 * Built as a card stack rather than a detail page on purpose: architecture.md
 * §3.6 makes working through a batch the signal that drives generation of the
 * next one, so the queue — not the single post — is the unit of review.
 */
export default function ReviewPage() {
  const posts = usePosts();
  const [index, setIndex] = React.useState(0);

  // A post is reviewable once its design HTML exists — the PNGs are not
  // rendered until it is approved, so waiting on them would empty the queue.
  const queue = React.useMemo(
    () =>
      (posts.data ?? [])
        .filter((post: Post) => isReviewable(post) && hasPreview(post))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [posts.data],
  );

  const pending = (posts.data ?? []).filter(
    (post: Post) => isReviewable(post) && !hasPreview(post),
  );

  if (posts.isPending) {
    return (
      <div className="mx-auto w-full max-w-[34rem]">
        <Skeleton className="aspect-[3/4] w-full rounded-card" />
      </div>
    );
  }

  if (posts.isError) return <ErrorNote message={toMessage(posts.error)} />;

  if (queue.length === 0) {
    return (
      <EmptyState
        title={pending.length ? "Still generating" : "Queue is clear"}
        body={
          pending.length
            ? `${pending.length} ${pending.length === 1 ? "post is" : "posts are"} still being drafted or composed. Open one to watch it finish.`
            : "Nothing waiting on you. Draft a post from a URL and it will land here."
        }
        action={
          pending.length ? (
            <Button asChild variant="secondary">
              <Link href={`/posts/${pending[0].id}`}>Open in progress</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/posts/new">
                <Plus className="size-4" aria-hidden />
                New post
              </Link>
            </Button>
          )
        }
      />
    );
  }

  const position = Math.min(index, queue.length - 1);
  const post = queue[position];

  return (
    <ReviewSurface
      post={post}
      onAdvance={() => setIndex((value) => value + 1)}
      footer={
        <p className="text-sm text-ink-subtle">
          {position + 1} of {queue.length} waiting
          {pending.length ? ` · ${pending.length} still generating` : ""}
        </p>
      }
    />
  );
}
