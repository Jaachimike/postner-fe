"use client";

import * as React from "react";
import { useCompose, useGenerateImages } from "@/features/posts/hooks";
import { toMessage } from "@/lib/api/errors";
import type { Post } from "@/lib/api/types";

export type StepState = "pending" | "running" | "done" | "skipped" | "error";

export interface PipelineStep {
  id: "draft" | "images" | "compose";
  label: string;
  state: StepState;
}

/**
 * Drives draft -> images -> compose to completion.
 *
 * The API splits these deliberately (the draft is cheap, Recraft and the
 * Playwright render are not), but a person creating a post wants one outcome:
 * a finished preview. So we run the remaining legs automatically and surface
 * them as progress rather than as three buttons.
 */
export function usePostPipeline(post: Post | undefined) {
  const postId = post?.id ?? "";
  const images = useGenerateImages(postId);
  const compose = useCompose(postId);
  const [error, setError] = React.useState<string | null>(null);

  // Text-only packs need no Recraft pass at all.
  const needsImages = (post?.content?.pack_images_needed ?? 1) > 0;
  const isComposed = Boolean(post?.composed?.pages?.length);
  const hasImages = Object.keys(post?.images ?? {}).length > 0;

  const started = React.useRef(false);

  const run = React.useCallback(async () => {
    if (!post) return;
    setError(null);
    try {
      if (needsImages && !hasImages) {
        await images.mutateAsync({ regenerate: false });
      }
      await compose.mutateAsync({ ensure_images: true });
    } catch (cause) {
      setError(toMessage(cause, "Generation failed."));
    }
    // `images`/`compose` are stable mutation objects from React Query; including
    // them would re-create this callback on every render and restart the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, needsImages, hasImages]);

  React.useEffect(() => {
    if (!post || isComposed || started.current) return;
    started.current = true;
    void run();
  }, [post, isComposed, run]);

  function retry() {
    started.current = true;
    void run();
  }

  const steps: PipelineStep[] = [
    { id: "draft", label: "Drafting copy", state: post ? "done" : "running" },
    {
      id: "images",
      label: "Generating photos",
      state: !needsImages
        ? "skipped"
        : images.isPending
          ? "running"
          : hasImages
            ? "done"
            : error && !isComposed
              ? "error"
              : "pending",
    },
    {
      id: "compose",
      label: "Composing design",
      state: compose.isPending
        ? "running"
        : isComposed
          ? "done"
          : error
            ? "error"
            : "pending",
    },
  ];

  return {
    steps,
    error,
    retry,
    isRunning: images.isPending || compose.isPending,
    isComposed,
  };
}
