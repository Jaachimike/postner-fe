"use client";

import * as React from "react";
import { useCompose, useGenerateImages } from "@/features/posts/hooks";
import { toMessage } from "@/lib/api/errors";
import { hasPreview, type Post } from "@/lib/api/types";

export type StepState = "pending" | "running" | "done" | "skipped" | "error";

export interface PipelineStep {
  id: "draft" | "images" | "preview";
  label: string;
  state: StepState;
}

/**
 * Drives draft -> images -> HTML preview to completion.
 *
 * It stops at the preview on purpose. `POST /compose` now only fills the
 * template HTML; the Playwright render and the storage upload happen at
 * approval (`POST /feedback`) or on an explicit `POST /render`. Nothing here
 * should ever trigger a PNG — that is the whole point of the split, so that we
 * only rasterise designs a person actually kept.
 */
export function usePostPipeline(post: Post | undefined) {
  const postId = post?.id ?? "";
  const images = useGenerateImages(postId);
  const compose = useCompose(postId);
  const [error, setError] = React.useState<string | null>(null);

  // Text-only packs need no Recraft pass at all.
  const needsImages = (post?.content?.pack_images_needed ?? 1) > 0;
  const isReady = Boolean(post && hasPreview(post));
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
    if (!post || isReady || started.current) return;
    started.current = true;
    void run();
  }, [post, isReady, run]);

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
            : error && !isReady
              ? "error"
              : "pending",
    },
    {
      id: "preview",
      label: "Building the design",
      state: compose.isPending
        ? "running"
        : isReady
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
    isReady,
  };
}
