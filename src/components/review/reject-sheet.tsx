"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Field, Textarea } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/feedback";
import { useFeedback } from "@/features/posts/hooks";
import { REJECT_REASONS, composedPages, type Post } from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";

export function RejectSheet({
  post,
  open,
  onOpenChange,
  onRejected,
}: {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRejected: () => void;
}) {
  const feedback = useFeedback(post.id);
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [pageId, setPageId] = React.useState("");

  const pages = composedPages(post);
  // The API accepts an empty rejection, but a reason is the entire point of
  // capturing one — it is what teaches the next draft.
  const canSubmit = reasons.length > 0 || note.trim().length > 0;

  function submit() {
    feedback.mutate(
      {
        decision: "rejected",
        reasons,
        note: note.trim(),
        page_id: pageId || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onRejected();
        },
      },
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Why reject?"
      description="This feeds back into how the next draft is written."
      footer={
        <>
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!canSubmit}
            loading={feedback.isPending}
            onClick={submit}
          >
            Submit rejection
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ErrorNote message={feedback.isError ? toMessage(feedback.error) : null} />

        <Field label="Reasons" htmlFor="rej_reasons">
          <div id="rej_reasons">
            <ChipGroup
              ariaLabel="Rejection reasons"
              multiple
              options={REJECT_REASONS.map((reason) => ({ ...reason }))}
              value={reasons}
              onChange={setReasons}
            />
          </div>
        </Field>

        {pages.length > 1 ? (
          <Field
            label="Scope"
            htmlFor="rej_page"
            hint="Reject the whole post, or call out one slide."
          >
            <div id="rej_page">
              <ChipGroup
                ariaLabel="Rejection scope"
                options={[
                  { value: "", label: "Whole post" },
                  ...pages.map((page, index) => ({
                    value: page.page_id,
                    label: `Slide ${index + 1}`,
                  })),
                ]}
                value={[pageId]}
                onChange={(next) => setPageId(next[0] ?? "")}
              />
            </div>
          </Field>
        ) : null}

        <Field label="Notes" htmlFor="rej_note" optional>
          <Textarea
            id="rej_note"
            rows={3}
            placeholder="Sounds like LinkedIn, not X."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        {!canSubmit ? (
          <p className="text-xs text-ink-subtle">
            Pick a reason or leave a note to submit.
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
