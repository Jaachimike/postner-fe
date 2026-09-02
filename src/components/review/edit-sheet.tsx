"use client";

import * as React from "react";
import { Tabs } from "radix-ui";
import { Undo2, Wand2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Toggle } from "@/components/ui/switch";
import { ErrorNote } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";
import { useVariants } from "@/features/catalog/hooks";
import { useRedesign, useRevisions, useRewrite, useUndo } from "@/features/posts/hooks";
import { isPack, type CarouselSlide, type Post } from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";

export function EditSheet({
  post,
  open,
  onOpenChange,
  defaultPageId,
}: {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The slide the reviewer is looking at, so Copy opens on it. */
  defaultPageId?: string;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit"
      description="Change the words or the look. The preview re-renders in place."
    >
      <Tabs.Root defaultValue="copy" className="flex flex-col gap-5">
        <Tabs.List
          aria-label="Edit mode"
          className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-bg p-1"
        >
          {[
            { value: "copy", label: "Copy" },
            { value: "look", label: "Look" },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "rounded-lg py-1.5 text-sm text-ink-muted transition-colors",
                "data-[state=active]:bg-surface data-[state=active]:font-medium data-[state=active]:text-ink",
                "data-[state=active]:shadow-sm data-[state=active]:shadow-ink/5",
              )}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* `forceMount` because Radix unmounts inactive tab content, which would
            discard typed-but-unsaved copy on a trip to the Look tab and back.
            The sheet itself still unmounts on close, so opening is a fresh
            start — that reset is what seeds the draft from the current post. */}
        <Tabs.Content
          value="copy"
          forceMount
          className="outline-none data-[state=inactive]:hidden"
        >
          <CopyTab
            post={post}
            defaultPageId={defaultPageId}
            onDone={() => onOpenChange(false)}
          />
        </Tabs.Content>
        <Tabs.Content value="look" className="outline-none">
          <LookTab post={post} onDone={() => onOpenChange(false)} />
        </Tabs.Content>
      </Tabs.Root>
    </Sheet>
  );
}

function CopyTab({
  post,
  defaultPageId,
  onDone,
}: {
  post: Post;
  defaultPageId?: string;
  onDone: () => void;
}) {
  const rewrite = useRewrite(post.id);
  const pack = isPack(post);
  const slides = post.content?.slides ?? [];

  const [caption, setCaption] = React.useState(post.content?.ig_fb_caption ?? "");
  const [overlay, setOverlay] = React.useState(post.content?.overlay_text ?? "");

  /**
   * Every slide's copy, not just the selected one.
   *
   * Holding one slide meant switching the picker re-read that slide from props
   * and threw away whatever had been typed for the slide being left, and the
   * submit spliced only the in-memory slide back in — so editing slide 1 then
   * slide 2 saved slide 2 and silently reverted slide 1.
   *
   * Keyed by `page_id` rather than position because `content.slides` and
   * `composed.pages` agree only by id, and the selected slide arrives from the
   * carousel as an id for the same reason.
   *
   * Seeded once: this component lives inside `<Sheet>`, which unmounts its
   * children on close, so each open starts from the post's current copy.
   */
  const [draft, setDraft] = React.useState<Record<string, CarouselSlide>>(() =>
    Object.fromEntries(slides.map((entry) => [entry.page_id, { ...entry }])),
  );
  const [pageId, setPageId] = React.useState(() =>
    defaultPageId && slides.some((entry) => entry.page_id === defaultPageId)
      ? defaultPageId
      : (slides[0]?.page_id ?? ""),
  );

  const slide: CarouselSlide = draft[pageId] ?? { page_id: pageId };

  function setField(key: keyof CarouselSlide, value: string) {
    setDraft((prev) => ({
      ...prev,
      [pageId]: { ...(prev[pageId] ?? { page_id: pageId }), [key]: value },
    }));
  }

  function apply(suggest: boolean) {
    const text = pack
      ? { slides: slides.map((entry) => draft[entry.page_id] ?? entry) }
      : { overlay_text: overlay };
    // Always re-fill: `recompose` only fills HTML now, so there is nothing to
    // save by skipping it, and skipping would leave the preview showing copy
    // the post no longer has.
    rewrite.mutate(
      { caption, text, suggest, recompose: true },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ErrorNote message={rewrite.isError ? toMessage(rewrite.error) : null} />

      <Field label="Caption" htmlFor="edit_caption" hint="The Instagram / Facebook caption.">
        <Textarea
          id="edit_caption"
          rows={4}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </Field>

      {pack && slides.length > 0 ? (
        <>
          <Field label="Slide" htmlFor="edit_slide">
            <Select
              id="edit_slide"
              value={pageId}
              onChange={(event) => setPageId(event.target.value)}
            >
              {slides.map((entry, index) => (
                <option key={entry.page_id} value={entry.page_id}>
                  {index + 1}. {entry.title || entry.page_id}
                </option>
              ))}
            </Select>
          </Field>

          {(
            [
              ["title", "Title", "input"],
              ["subtitle", "Subtitle", "input"],
              ["body", "Body", "textarea"],
              ["body_2", "Body 2", "textarea"],
              ["cta", "Call to action", "input"],
            ] as const
          ).map(([key, label, kind]) =>
            key in slide || kind === "input" ? (
              <Field key={key} label={label} htmlFor={`edit_${key}`} optional>
                {kind === "textarea" ? (
                  <Textarea
                    id={`edit_${key}`}
                    rows={3}
                    value={slide[key] ?? ""}
                    onChange={(event) => setField(key, event.target.value)}
                  />
                ) : (
                  <Input
                    id={`edit_${key}`}
                    value={slide[key] ?? ""}
                    onChange={(event) => setField(key, event.target.value)}
                  />
                )}
              </Field>
            ) : null,
          )}
        </>
      ) : (
        <Field label="Overlay text" htmlFor="edit_overlay" optional>
          <Textarea
            id="edit_overlay"
            rows={3}
            value={overlay}
            onChange={(event) => setOverlay(event.target.value)}
          />
        </Field>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          loading={rewrite.isPending}
          onClick={() => apply(true)}
        >
          <Wand2 className="size-4" aria-hidden />
          Suggest
        </Button>
        <Button className="flex-1" loading={rewrite.isPending} onClick={() => apply(false)}>
          Apply copy
        </Button>
      </div>
    </div>
  );
}

function LookTab({ post, onDone }: { post: Post; onDone: () => void }) {
  const redesign = useRedesign(post.id);
  const undo = useUndo(post.id);
  const variants = useVariants(post.brand_id);
  const revisions = useRevisions(post.id);

  const [variantId, setVariantId] = React.useState(post.variant_id ?? "");
  const [regenerateImages, setRegenerateImages] = React.useState(false);

  return (
    <div className="flex flex-col gap-5">
      <ErrorNote
        message={
          redesign.isError
            ? toMessage(redesign.error)
            : undo.isError
              ? toMessage(undo.error)
              : null
        }
      />

      <Field
        label="Colour variant"
        htmlFor="edit_variant"
        hint="Palettes are stored per brand. Leave empty and propose a new one instead."
      >
        <Select
          id="edit_variant"
          value={variantId}
          onChange={(event) => setVariantId(event.target.value)}
        >
          <option value="">No change</option>
          {(variants.data ?? []).map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="rounded-xl border border-border bg-bg p-4">
        <Toggle
          id="edit_regen_images"
          checked={regenerateImages}
          onCheckedChange={setRegenerateImages}
          label="Generate new photos"
          hint="Slower and costs a Recraft pass. Off keeps the existing shots."
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          loading={redesign.isPending}
          onClick={() =>
            redesign.mutate(
              {
                variant_id: null,
                propose: true,
                regenerate_images: regenerateImages,
                recompose: true,
              },
              { onSuccess: onDone },
            )
          }
        >
          <Wand2 className="size-4" aria-hidden />
          Propose palette
        </Button>
        <Button
          className="flex-1"
          disabled={!variantId}
          loading={redesign.isPending}
          onClick={() =>
            redesign.mutate(
              {
                variant_id: variantId,
                propose: false,
                regenerate_images: regenerateImages,
                recompose: true,
              },
              { onSuccess: onDone },
            )
          }
        >
          Apply look
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-ink-subtle">
          {revisions.data?.length
            ? `${revisions.data.length} saved ${revisions.data.length === 1 ? "revision" : "revisions"}`
            : "No revisions yet"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={!revisions.data?.length}
          loading={undo.isPending}
          // Close on success like every other action here: an undo changes the
          // design, and the point of undoing is to look at what you got back.
          onClick={() => undo.mutate(undefined, { onSuccess: onDone })}
        >
          <Undo2 className="size-4" aria-hidden />
          Undo last change
        </Button>
      </div>
    </div>
  );
}
