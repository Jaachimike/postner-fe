"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PostCard } from "@/components/post/post-card";
import { FabRow } from "@/components/post/fab-row";
import { RejectSheet } from "@/components/review/reject-sheet";
import { EditSheet } from "@/components/review/edit-sheet";
import { DownloadSheet } from "@/components/review/download-sheet";
import { ErrorNote } from "@/components/ui/feedback";
import { useFeedback } from "@/features/posts/hooks";
import { useBrands } from "@/features/brands/hooks";
import { toMessage } from "@/lib/api/errors";
import type { Post } from "@/lib/api/types";

type Sheet = "none" | "reject" | "edit" | "download";

/**
 * The review chrome: one card, three actions.
 *
 * `onAdvance` is what makes this reusable between the single-post route and
 * the queue — in the queue it moves to the next card, on a detail page it is
 * a no-op.
 */
export function ReviewSurface({
  post,
  onAdvance,
  footer,
}: {
  post: Post;
  onAdvance: () => void;
  footer?: React.ReactNode;
}) {
  const [sheet, setSheet] = React.useState<Sheet>("none");
  const feedback = useFeedback(post.id);
  const brands = useBrands();
  const reduceMotion = useReducedMotion();

  const brand = brands.data?.find((item) => item.id === post.brand_id);

  function approve() {
    feedback.mutate(
      { decision: "approved" },
      { onSuccess: () => setSheet("download") },
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-[34rem]">
        <ErrorNote
          message={feedback.isError ? toMessage(feedback.error) : null}
          className="mb-4"
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={post.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <PostCard post={post} brand={brand} />
          </motion.div>
        </AnimatePresence>
      </div>

      <FabRow
        onReject={() => setSheet("reject")}
        onEdit={() => setSheet("edit")}
        onApprove={approve}
        disabled={feedback.isPending}
      />

      {footer}

      <RejectSheet
        post={post}
        open={sheet === "reject"}
        onOpenChange={(open) => setSheet(open ? "reject" : "none")}
        onRejected={onAdvance}
      />
      <EditSheet
        post={post}
        open={sheet === "edit"}
        onOpenChange={(open) => setSheet(open ? "edit" : "none")}
      />
      <DownloadSheet
        post={post}
        open={sheet === "download"}
        onOpenChange={(open) => setSheet(open ? "download" : "none")}
        onDone={() => {
          setSheet("none");
          onAdvance();
        }}
      />
    </div>
  );
}
