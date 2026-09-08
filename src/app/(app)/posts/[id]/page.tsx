"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Generating } from "@/components/post/generating";
import { FitBox } from "@/components/post/media-frame";
import { ReviewSurface } from "@/components/review/review-surface";
import { ErrorNote, Skeleton } from "@/components/ui/feedback";
import { usePost } from "@/features/posts/hooks";
import { usePostPipeline } from "@/features/posts/use-pipeline";
import { toMessage } from "@/lib/api/errors";

export default function PostPage() {
  const postId = String(useParams().id ?? "");
  const router = useRouter();
  const post = usePost(postId);
  const pipeline = usePostPipeline(post.data);

  if (post.isPending) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-[34rem] flex-1 flex-col">
        <FitBox aspect={3 / 4} minHeight="3rem">
          <Skeleton className="size-full rounded-card" />
        </FitBox>
      </div>
    );
  }

  if (post.isError) {
    return <ErrorNote message={toMessage(post.error)} />;
  }

  if (!pipeline.isReady) {
    return (
      <Generating
        steps={pipeline.steps}
        error={pipeline.error}
        onRetry={pipeline.retry}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Link
        href="/review"
        className="inline-flex w-fit shrink-0 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to queue
      </Link>

      <ReviewSurface post={post.data} onAdvance={() => router.push("/review")} />
    </div>
  );
}
