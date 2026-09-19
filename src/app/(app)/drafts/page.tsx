"use client";

import * as React from "react";
import Link from "next/link";
import { ImagePlus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PostGrid } from "@/components/post/post-tile";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
import { usePosts } from "@/features/posts/hooks";
import { useBrands } from "@/features/brands/hooks";
import { hasPreview, isReviewable, type Post } from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";

/**
 * Everything in flight — drafting, drafted, imaged, composed, waiting.
 *
 * The overview to the review queue's working mode: this is where you find one
 * post, the queue is where you work through all of them.
 */
export default function DraftsPage() {
  const brands = useBrands();
  const posts = usePosts({
    refetchInterval: (query) => {
      const list = (query.state.data as Post[] | undefined) ?? [];
      const waiting = list.some(
        (post) =>
          (isReviewable(post) || post.status === "drafting") &&
          !hasPreview(post) &&
          post.meta?.pipeline_status !== "failed",
      );
      return waiting ? 2000 : false;
    },
  });

  const drafts = React.useMemo(
    () =>
      (posts.data ?? [])
        .filter(
          (post: Post) =>
            isReviewable(post) ||
            post.status === "drafting" ||
            post.meta?.pipeline_status === "failed",
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [posts.data],
  );

  return (
    <>
      <PageHeader
        title="Drafts"
        description="Posts on their way to review."
      />

      {posts.isPending ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <li key={key}>
              <Skeleton className="h-80 rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : posts.isError ? (
        <ErrorNote message={toMessage(posts.error)} />
      ) : drafts.length === 0 ? (
        <EmptyState
          variant="bare"
          icon={ImagePlus}
          title="No drafts yet"
          body="Point Postner at an article and it writes the copy, generates the images, and lays out the design. What comes back lands here."
          action={
            <>
              <Button asChild>
                <Link href="/posts/new">
                  <Sparkles className="size-4" aria-hidden />
                  New post
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/brands">Set up a brand</Link>
              </Button>
            </>
          }
        />
      ) : (
        <PostGrid posts={drafts} brands={brands.data} />
      )}
    </>
  );
}
