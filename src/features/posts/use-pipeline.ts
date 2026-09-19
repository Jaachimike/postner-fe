"use client";

import { useFinalizePost } from "@/features/posts/hooks";
import { hasPreview, type Post } from "@/lib/api/types";

export type StepState = "pending" | "running" | "done" | "skipped" | "error";

export interface PipelineStep {
  id: "draft" | "images" | "preview";
  label: string;
  state: StepState;
}

export function pipelineStepsForPost(post: Post | undefined): PipelineStep[] {
  const isReady = Boolean(post && hasPreview(post));
  const status =
    typeof post?.meta?.pipeline_status === "string" ? post.meta.pipeline_status : "";
  const isFailed = status === "failed";
  const needsImages = (post?.content?.pack_images_needed ?? 1) > 0;
  const byPage = (post?.images as { by_page?: Record<string, unknown> } | undefined)
    ?.by_page;
  const hasImages = Boolean(byPage && Object.keys(byPage).length > 0);
  const hasCopy = postHasCopy(post);

  const drafting =
    status === "drafting" ||
    post?.status === "drafting" ||
    (!hasCopy && !isReady && !isFailed);
  const composing =
    status === "composing" ||
    post?.status === "imaged" ||
    (hasCopy && !isReady && !isFailed);

  return [
    {
      id: "draft",
      label: "Drafting copy",
      state:
        isFailed && !hasCopy
          ? "error"
          : hasCopy || isReady
            ? "done"
            : drafting
              ? "running"
              : "pending",
    },
    {
      id: "images",
      label: "Generating photos",
      state: !needsImages
        ? "skipped"
        : isFailed && hasCopy && !hasImages && !isReady
          ? "error"
          : hasImages || isReady
            ? "done"
            : composing
              ? "running"
              : "pending",
    },
    {
      id: "preview",
      label: "Building the design",
      state: isFailed && !isReady
        ? "error"
        : isReady
          ? "done"
          : composing
            ? "running"
            : "pending",
    },
  ];
}

/**
 * Waits for the worker to finish draft → images → HTML preview.
 *
 * Does not call /images or /compose — those are owned by Taskiq so opening
 * this page never recomposes an already-finished post. The caller should
 * poll `usePost` while `!isReady && !error`.
 */
export function usePostPipeline(post: Post | undefined) {
  const postId = post?.id ?? "";
  const isReady = Boolean(post && hasPreview(post));
  const status =
    typeof post?.meta?.pipeline_status === "string" ? post.meta.pipeline_status : "";
  const isFailed = status === "failed";
  const metaError =
    typeof post?.meta?.pipeline_error === "string" && post.meta.pipeline_error.trim()
      ? post.meta.pipeline_error.trim()
      : null;
  const error = isFailed ? metaError ?? "Generation failed." : null;

  const finalize = useFinalizePost(postId);
  const steps = pipelineStepsForPost(post);

  function retry() {
    if (!postId) return;
    void finalize.mutateAsync(undefined);
  }

  return {
    steps,
    error: finalize.isError ? "Could not restart generation." : error,
    retry,
    isRunning: !isReady && !isFailed,
    isReady,
    isFailed,
    shouldPoll: Boolean(post) && !isReady && !isFailed,
  };
}

function postHasCopy(post: Post | undefined): boolean {
  if (!post?.content) return false;
  const content = post.content;
  if (content.mode === "pack") return (content.slides?.length ?? 0) > 0;
  return Boolean(
    content.ig_fb_caption || content.overlay_text || content.visual_prompt,
  );
}
