"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ReviewSurface } from "@/components/review/review-surface";
import { Generating } from "@/components/post/generating";
import { FitBox } from "@/components/post/media-frame";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
import { useFinalizePost, usePosts } from "@/features/posts/hooks";
import { pipelineStepsForPost } from "@/features/posts/use-pipeline";
import { hasPreview, isReviewable, type Post } from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";
import * as React from "react";

/**
 * The review queue.
 *
 * Built as a card stack rather than a detail page on purpose: architecture.md
 * §3.6 makes working through a batch the signal that drives generation of the
 * next one, so the queue — not the single post — is the unit of review.
 */
export default function ReviewPage() {
  const [index, setIndex] = React.useState(0);
  const posts = usePosts({
    refetchInterval: (query) => {
      const list = (query.state.data as Post[] | undefined) ?? [];
      const waiting = list.some((post) => {
        if (hasPreview(post)) return false;
        if (post.meta?.pipeline_status === "failed") return false;
        return (
          post.status === "drafting" ||
          isReviewable(post) ||
          post.meta?.pipeline_status === "pending" ||
          post.meta?.pipeline_status === "drafting" ||
          post.meta?.pipeline_status === "composing"
        );
      });
      return waiting ? 2000 : false;
    },
  });

  const queue = React.useMemo(
    () =>
      (posts.data ?? [])
        .filter((post: Post) => isReviewable(post) && hasPreview(post))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [posts.data],
  );

  const pending = React.useMemo(
    () =>
      (posts.data ?? []).filter((post: Post) => {
        if (hasPreview(post)) return false;
        if (post.meta?.pipeline_status === "failed") return false;
        return (
          post.status === "drafting" ||
          isReviewable(post) ||
          post.meta?.pipeline_status === "pending" ||
          post.meta?.pipeline_status === "drafting" ||
          post.meta?.pipeline_status === "composing"
        );
      }),
    [posts.data],
  );

  const failed = (posts.data ?? []).filter(
    (post: Post) => post.meta?.pipeline_status === "failed" && !hasPreview(post),
  );

  // Show pipeline steps for the furthest-along pending post (or the first).
  const focusPost = React.useMemo(() => {
    if (pending.length === 0) return undefined;
    const rank = (post: Post) => {
      if (post.status === "imaged" || post.meta?.pipeline_status === "composing") return 2;
      if (postHasCopy(post) || post.status === "drafted") return 1;
      return 0;
    };
    return [...pending].sort((a, b) => rank(b) - rank(a))[0];
  }, [pending]);

  const steps = pipelineStepsForPost(focusPost);
  const focusFailed = focusPost?.meta?.pipeline_status === "failed";
  const focusError =
    focusFailed && typeof focusPost?.meta?.pipeline_error === "string"
      ? focusPost.meta.pipeline_error
      : null;
  const finalize = useFinalizePost(focusPost?.id ?? "");

  if (posts.isPending) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-[34rem] flex-1 flex-col">
        <FitBox aspect={3 / 4} minHeight="3rem">
          <Skeleton className="size-full rounded-card" />
        </FitBox>
      </div>
    );
  }

  if (posts.isError) return <ErrorNote message={toMessage(posts.error)} />;

  if (queue.length === 0 && pending.length > 0) {
    const count = pending.length;
    return (
      <Generating
        steps={steps}
        error={focusError}
        onRetry={
          focusPost
            ? () => {
                void finalize.mutateAsync(undefined);
              }
            : undefined
        }
        title={count === 1 ? "Creating your post…" : "Creating your posts…"}
        description={
          count === 1
            ? "Finishing in the background. It will show up here when ready."
            : `${count} posts finishing in the background. They will show up here as each one is ready.`
        }
      />
    );
  }

  if (queue.length === 0) {
    return (
      <EmptyState
        title="Queue is clear"
        body={
          failed.length
            ? `${failed.length} ${failed.length === 1 ? "post failed" : "posts failed"} to generate. Open one from Drafts to retry.`
            : "Nothing waiting on you. Draft a post from a URL and it will land here."
        }
        action={
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="size-4" aria-hidden />
              New post
            </Link>
          </Button>
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

function postHasCopy(post: Post): boolean {
  const content = post.content;
  if (!content) return false;
  if (content.mode === "pack") return (content.slides?.length ?? 0) > 0;
  return Boolean(
    content.ig_fb_caption || content.overlay_text || content.visual_prompt,
  );
}
