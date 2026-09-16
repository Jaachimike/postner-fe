"use client";

import * as React from "react";
import { Tabs } from "radix-ui";
import { Undo2, Wand2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ChipGroup } from "@/components/ui/chip";
import { Toggle } from "@/components/ui/switch";
import { ErrorNote } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";
import { useRedesign, useRevisions, useRewrite, useUndo } from "@/features/posts/hooks";
import {
  IMAGE_STYLES,
  asImageStyle,
  isPack,
  hasMarkup,
  packPageFields,
  type CarouselSlide,
  type ImageStyle,
  type Post,
} from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";

type SlideField = Exclude<keyof CarouselSlide, "page_id">;

/**
 * How each slide field is labelled and typed into.
 *
 * Keyed by every editable key on `CarouselSlide`, so it doubles as the runtime
 * check for which names can actually be saved — see `isSlideField`.
 */
const SLIDE_FIELD_META: Record<SlideField, { label: string; kind: "input" | "textarea" }> = {
  title: { label: "Title", kind: "input" },
  subtitle: { label: "Subtitle", kind: "input" },
  body: { label: "Body", kind: "textarea" },
  body_2: { label: "Body 2", kind: "textarea" },
  body_emphasis: { label: "Emphasis", kind: "input" },
  page_number: { label: "Page number", kind: "input" },
  cta: { label: "Call to action", kind: "input" },
  brand: { label: "Brand", kind: "input" },
  series: { label: "Series", kind: "input" },
  script: { label: "Script", kind: "textarea" },
  next: { label: "Next teaser", kind: "input" },
  handle: { label: "Handle", kind: "input" },
  visual_prompt: { label: "Visual prompt", kind: "textarea" },
};

function isSlideField(key: string): key is SlideField {
  return key in SLIDE_FIELD_META;
}

/**
 * Inputs to offer when the post has no `pack_pages` to go on.
 *
 * The list this screen used to render unconditionally. Posts drafted before
 * the API started snapshotting the pack schema still land here.
 */
const FALLBACK_FIELDS = ["title", "subtitle", "body", "body_2", "cta"];

const MARKUP_MESSAGE =
  "Remove the HTML tag or javascript: link. The API refuses markup in post copy.";

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

  /** The one field holding markup the API would refuse, if any. */
  const [invalidField, setInvalidField] = React.useState<string | null>(null);
  const errorFor = (key: string) => (invalidField === key ? MARKUP_MESSAGE : undefined);

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

  /**
   * Which inputs the selected slide gets.
   *
   * Driven by that page's own field list, so a pack offers only what its HTML
   * fills: the `lifestyle_tips` cover takes `script` and `title`, where this
   * screen used to show Title, Subtitle, Body, Body 2 and CTA on every slide —
   * three of them writing to `content` and changing nothing on the page, while
   * `script` could not be edited at all.
   *
   * Names outside `CarouselSlide` are dropped rather than rendered. The rewrite
   * endpoint revalidates each slide through that schema and discards keys it
   * does not know, so an input for one would look like it saved and silently
   * not. A pack declaring such a field is not editable here until the slide
   * schema gains it.
   */
  const fields = (packPageFields(post.content, pageId) ?? FALLBACK_FIELDS).filter(
    isSlideField,
  );

  function setField(key: keyof CarouselSlide, value: string) {
    setInvalidField(null);
    setDraft((prev) => ({
      ...prev,
      [pageId]: { ...(prev[pageId] ?? { page_id: pageId }), [key]: value },
    }));
  }

  /**
   * Find the first input the API would reject, so it can be pointed at.
   *
   * Slides are checked in pager order and only on the fields actually shown,
   * so the report lands somewhere the user can see and fix. Returns the slide
   * to switch to as well, since the offending field is usually not on screen.
   */
  function findMarkup(): { key: string; pageId?: string } | null {
    if (hasMarkup(caption)) return { key: "caption" };
    if (!pack) return hasMarkup(overlay) ? { key: "overlay" } : null;
    for (const entry of slides) {
      const value = draft[entry.page_id] ?? entry;
      const shown = (packPageFields(post.content, entry.page_id) ?? FALLBACK_FIELDS).filter(
        isSlideField,
      );
      for (const key of shown) {
        if (hasMarkup(value[key])) return { key, pageId: entry.page_id };
      }
    }
    return null;
  }

  function apply(suggest: boolean) {
    // Pre-flight the server's markup rule. It would reject this anyway; doing
    // it here is what lets the message sit on the field instead of arriving as
    // a sheet-level 422 that names a field but cannot highlight it.
    const bad = findMarkup();
    if (bad) {
      if (bad.pageId) setPageId(bad.pageId);
      setInvalidField(bad.key);
      return;
    }
    setInvalidField(null);

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

      <Field
        label="Caption"
        htmlFor="edit_caption"
        hint="The Instagram / Facebook caption."
        error={errorFor("caption")}
      >
        <Textarea
          id="edit_caption"
          rows={4}
          value={caption}
          onChange={(event) => {
            setInvalidField(null);
            setCaption(event.target.value);
          }}
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

          {fields.map((key) => {
            const { label, kind } = SLIDE_FIELD_META[key];
            return (
              <Field
                key={key}
                label={label}
                htmlFor={`edit_${key}`}
                optional
                error={errorFor(key)}
              >
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
            );
          })}
        </>
      ) : (
        <Field
          label="Overlay text"
          htmlFor="edit_overlay"
          optional
          error={errorFor("overlay")}
        >
          <Textarea
            id="edit_overlay"
            rows={3}
            value={overlay}
            onChange={(event) => {
              setInvalidField(null);
              setOverlay(event.target.value);
            }}
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
  const revisions = useRevisions(post.id);

  const current = asImageStyle(post.image_style);
  const [imageStyle, setImageStyle] = React.useState<ImageStyle>(current);
  const [regenerateImages, setRegenerateImages] = React.useState(false);

  // Redesign only re-fills the same markup unless something about the art
  // direction actually moves, so offering the button in that state would spend
  // a round trip to produce a design identical to the one on screen.
  const unchanged = imageStyle === current && !regenerateImages;

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
        label="Photo style"
        htmlFor="edit_image_style"
        hint={IMAGE_STYLES.find((style) => style.value === imageStyle)?.hint}
      >
        <div id="edit_image_style">
          <ChipGroup
            ariaLabel="Photo style"
            options={IMAGE_STYLES.map(({ value, label }) => ({ value, label }))}
            value={[imageStyle]}
            onChange={(next) => setImageStyle(next[0] as ImageStyle)}
          />
        </div>
      </Field>

      <div className="rounded-xl border border-border bg-bg p-4">
        <Toggle
          id="edit_regen_images"
          checked={regenerateImages}
          onCheckedChange={setRegenerateImages}
          label="Generate new photos"
          hint="Slower and costs a Recraft pass. Off keeps the existing shots."
        />
        {/* The style is stored on the post but only reaches Recraft when photos
            are generated, so switching it alone changes what the *next* batch
            looks like and nothing on screen. Saying so beats letting the button
            appear to do nothing. */}
        {imageStyle !== current && !regenerateImages ? (
          <p className="mt-3 border-t border-border pt-3 text-xs text-ink-subtle">
            Saved for later. The existing photos keep their current style until
            you generate new ones.
          </p>
        ) : null}
      </div>

      <Button
        className="w-full"
        disabled={unchanged}
        loading={redesign.isPending}
        onClick={() =>
          redesign.mutate(
            {
              image_style: imageStyle,
              regenerate_images: regenerateImages,
              recompose: true,
            },
            { onSuccess: onDone },
          )
        }
      >
        <Wand2 className="size-4" aria-hidden />
        Apply look
      </Button>

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
