"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PostCard } from "@/components/post/post-card";
import { FabRow } from "@/components/post/fab-row";
import { RejectSheet } from "@/components/review/reject-sheet";
import { EditSheet } from "@/components/review/edit-sheet";
import { DownloadSheet } from "@/components/review/download-sheet";
import { ErrorNote, Spinner } from "@/components/ui/feedback";
import { useFeedback } from "@/features/posts/hooks";
import { useBrands } from "@/features/brands/hooks";
import { useSlideIndex } from "@/features/posts/use-slide-index";
import { toMessage } from "@/lib/api/errors";
import { previewPages, type Post } from "@/lib/api/types";

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

  /**
   * The visible slide lives here, not in the card, so the sheets can open on
   * the slide being looked at rather than always on the first one.
   *
   * It is identified downstream by `page_id`, never by this index: the pager
   * walks `composed.pages` while the edit sheet walks `content.slides`, and
   * those two arrays agree only by id. Passing the number would send the sheets
   * to the wrong slide in exactly the cases this is meant to fix.
   */
  const pages = previewPages(post);
  const slide = useSlideIndex(post.id, pages.length);
  const activePageId = pages[slide.index]?.page_id ?? "";

  /**
   * Approving is the expensive step now: the API renders every page with
   * Playwright and uploads the PNGs before it answers, so this request runs for
   * seconds rather than milliseconds. Say so instead of leaving a dead button.
   */
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
            <PostCard
              post={post}
              brand={brand}
              slideIndex={slide.index}
              onSlideIndexChange={slide.setIndex}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <FabRow
        onReject={() => setSheet("reject")}
        onEdit={() => setSheet("edit")}
        onApprove={approve}
        disabled={feedback.isPending}
      />

      {feedback.isPending ? (
        <p
          className="flex items-center gap-2 text-sm text-ink-muted"
          aria-live="polite"
        >
          <Spinner />
          Rendering your files…
        </p>
      ) : null}

      {footer}

      <RejectSheet
        post={post}
        open={sheet === "reject"}
        onOpenChange={(open) => setSheet(open ? "reject" : "none")}
        onRejected={onAdvance}
        defaultPageId={activePageId}
      />
      <EditSheet
        post={post}
        open={sheet === "edit"}
        onOpenChange={(open) => setSheet(open ? "edit" : "none")}
        defaultPageId={activePageId}
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
