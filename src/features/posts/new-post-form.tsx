"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Images, Layers, Link2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { ChipGroup } from "@/components/ui/chip";
import { Ledger, LedgerDisclosure, LedgerRow } from "@/components/ui/ledger";
import { Toggle } from "@/components/ui/switch";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
import { HtmlPreview } from "@/components/ui/html-preview";
import { StyleTiles } from "@/components/post/style-tile";
import { cn } from "@/lib/utils/cn";
import { FORMAT_META, formatDimensions, formatLabel, type PostFormat } from "@/lib/formats";
import { toMessage } from "@/lib/api/errors";
import { useBrands } from "@/features/brands/hooks";
import { usePacks, useTemplates } from "@/features/catalog/hooks";
import {
  useAddRunSource,
  useCreateRun,
  useGenerateRun,
  usePatchRun,
  useRun,
  useRuns,
  useSuggestRun,
} from "@/features/posts/hooks";
import { IMAGE_STYLES, type ImageStyle } from "@/lib/api/types";
import type { components } from "@/lib/api/schema";

type Mode = "pack" | "template";
type SourceCard = components["schemas"]["SourceCard"];
type SuggestionBrief = components["schemas"]["SuggestionBrief"];

const MODE_OPTIONS = [
  { value: "template", label: "Single template", icon: Images },
  { value: "pack", label: "Carousel pack", icon: Layers },
] as const;

const URL_RE = /^https?:\/\/\S+$/i;
const EMPTY_CARDS: SourceCard[] = [];
const EMPTY_SUGGESTIONS: SuggestionBrief[] = [];

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function NewPostForm() {
  const router = useRouter();
  const params = useSearchParams();
  const brands = useBrands();
  const packs = usePacks();
  const templates = useTemplates();
  const listed = useRuns();
  const createRun = useCreateRun();

  const [runId, setRunId] = React.useState(params.get("run"));
  const run = useRun(runId);
  const addSource = useAddRunSource(runId);
  const patchRun = usePatchRun(runId);
  const suggest = useSuggestRun(runId);
  const generate = useGenerateRun(runId);

  const [paste, setPaste] = React.useState("");
  const [instruction, setInstruction] = React.useState("");
  const [suggestCount, setSuggestCount] = React.useState(3);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [mode, setMode] = React.useState<Mode>("template");
  const [packOverride, setPackOverride] = React.useState("");
  const [templateOverride, setTemplateOverride] = React.useState("");
  const [withImages, setWithImages] = React.useState(false);
  const [openRow, setOpenRow] = React.useState("");
  const [brandOverride, setBrandOverride] = React.useState(params.get("brand") ?? "");
  const [formatOverride, setFormatOverride] = React.useState<PostFormat | "">("");
  const [imageStyle, setImageStyle] = React.useState<ImageStyle>("realistic");

  const creating = React.useRef(false);
  const hydratedRun = React.useRef("");
  const urlRun = params.get("run");

  const writeRunParam = React.useCallback(
    (id: string) => {
      const next = new URLSearchParams();
      const brand = params.get("brand");
      if (brand) next.set("brand", brand);
      next.set("run", id);
      router.replace(`/posts/new?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  React.useEffect(() => {
    // Explicit ?run= resumes that session (after we just created one, or a deep link).
    if (urlRun) {
      setRunId(urlRun);
      return;
    }
    // Bare /posts/new — always start a blank run. Do not keep an in-memory
    // runId from a previous visit on this page.
    if (creating.current) return;
    creating.current = true;
    setRunId(null);
    hydratedRun.current = "";
    setPaste("");
    setInstruction("");
    setSelectedIds(new Set());
    setOpenRow("");
    createRun.mutate(undefined, {
      onSuccess: (created) => {
        setRunId(created.id);
        writeRunParam(created.id);
      },
      onSettled: () => {
        creating.current = false;
      },
    });
  }, [createRun, urlRun, writeRunParam]);

  React.useEffect(() => {
    if (!run.data || hydratedRun.current === run.data.id) return;
    hydratedRun.current = run.data.id;
    setInstruction(run.data.instruction);
    const defaultCount = listed.data?.default_suggested_posts ?? 3;
    setSuggestCount(defaultCount);
  }, [listed.data?.default_suggested_posts, run.data]);

  const cards: SourceCard[] = run.data?.cards ?? EMPTY_CARDS;
  // Prefer the run payload only — mutation cache can leak briefs from a prior run.
  const suggestions: SuggestionBrief[] = run.data?.suggestions ?? EMPTY_SUGGESTIONS;
  const suggestionKey = suggestions.map((item) => item.id).join(",");

  React.useEffect(() => {
    setSelectedIds(new Set(suggestionKey ? suggestionKey.split(",") : []));
  }, [suggestionKey]);

  const maxSources = listed.data?.max_run_sources ?? 10;
  const maxSuggested = listed.data?.max_suggested_posts ?? 10;
  const sourceIds = cards.map((card) => card.id);

  const brandId = brandOverride || brands.data?.[0]?.id || "";
  const brand = brands.data?.find((item) => item.id === brandId);
  const allowed = (brand?.formats ?? []) as PostFormat[];
  const format: PostFormat | "" =
    formatOverride && allowed.includes(formatOverride)
      ? formatOverride
      : (allowed[0] ?? "");

  const availablePacks = (packs.data ?? []).filter(
    (pack) => !format || pack.formats.includes(format),
  );
  const packId = availablePacks.some((pack) => pack.id === packOverride)
    ? packOverride
    : "";
  const pack = availablePacks.find((item) => item.id === packId);

  const availableTemplates = templates.data ?? [];
  const templateId = availableTemplates.some((item) => item.slug === templateOverride)
    ? templateOverride
    : "";
  const selectedTemplate = availableTemplates.find((item) => item.slug === templateId);

  if (brands.isPending || listed.isPending || (runId && run.isPending)) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }
  if (brands.isError) return <ErrorNote message={toMessage(brands.error)} />;
  if (!brands.data.length) {
    return (
      <EmptyState
        title="Create a brand first"
        body="Posts are drafted against a brand voice and its enabled formats, so there is nothing to generate until one exists."
        action={
          <Button asChild>
            <Link href="/brands">Go to brands</Link>
          </Button>
        }
      />
    );
  }

  const allowedFormats = ((brand?.formats ?? []) as PostFormat[]).map((value) => ({
    value,
    label: FORMAT_META[value].label,
  }));

  const designAnswer =
    mode === "template"
      ? selectedTemplate
        ? selectedTemplate.label || selectedTemplate.slug
        : "Chosen for you"
      : pack
        ? pack.label
        : "Chosen for you";

  const styleMeta = IMAGE_STYLES.find((style) => style.value === imageStyle);

  const summary = [
    `${cards.length} ${cards.length === 1 ? "source" : "sources"}`,
    mode === "template"
      ? selectedTemplate
        ? selectedTemplate.label || selectedTemplate.slug
        : "Layout chosen for you"
      : pack
        ? `${pack.pages} pages`
        : "Layout chosen for you",
    format ? formatDimensions(format) : null,
    withImages ? "photos with the draft" : "photos at compose",
  ]
    .filter(Boolean)
    .join(" · ");

  const previewFormat: PostFormat = format || "ig_portrait";
  const previewW = FORMAT_META[previewFormat].width;
  const previewH = FORMAT_META[previewFormat].height;
  const atCap = cards.length >= maxSources;
  const formError =
    addSource.isError
      ? toMessage(addSource.error)
      : suggest.isError
        ? toMessage(suggest.error)
        : generate.isError
          ? toMessage(generate.error)
          : run.isError
            ? toMessage(run.error)
            : listed.isError
              ? toMessage(listed.error)
              : null;

  function addPastedSource() {
    const value = paste.trim();
    if (!value || !runId || atCap || addSource.isPending) return;
    if (URL_RE.test(value)) {
      addSource.mutate(
        { url: value },
        { onSuccess: () => setPaste("") },
      );
      return;
    }
    addSource.mutate({ text: value }, { onSuccess: () => setPaste("") });
  }

  function removeSource(sourceId: string) {
    if (!run.data) return;
    const remaining = run.data.sources.filter((item) => item.id !== sourceId);
    patchRun.mutate({ sources: remaining, instruction });
  }

  function toggleBrief(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sourceLabelFor(sourceId: string): string | null {
    const card = cards.find((item) => item.id === sourceId);
    if (!card) return null;
    const host = card.canonical_url ? hostnameOf(card.canonical_url) : null;
    return card.title || host || null;
  }

  function onSuggest() {
    if (!runId || sourceIds.length === 0) return;
    suggest.mutate({
      source_ids: sourceIds,
      instruction,
      count: suggestCount,
    });
  }

  function onGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (!runId || sourceIds.length === 0) return;
    const checked = suggestions
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.id);
    generate.mutate(
      {
        source_ids: sourceIds,
        instruction,
        suggestion_ids: checked,
        brand_id: brandId || null,
        design: mode,
        pack_id: mode === "pack" ? packId || null : null,
        template_id: mode === "template" ? templateId || null : null,
        format: (format || null) as PostFormat | null,
        image_style: imageStyle,
        with_images: withImages,
      },
      {
        onSuccess: () => {
          router.push("/review");
        },
      },
    );
  }

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onGenerate}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.currentTarget.requestSubmit();
        }
      }}
      noValidate
    >
      <ErrorNote message={formError} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="post_source" className="sr-only">
            Source URL or pasted text
          </label>
          <div className="relative">
            <Link2
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 transition-colors",
                paste.trim() ? "text-accent" : "text-ink-subtle",
              )}
            />
            <input
              id="post_source"
              autoFocus
              placeholder="Paste a URL, YouTube link, or text"
              value={paste}
              disabled={atCap || addSource.isPending}
              onChange={(event) => setPaste(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPastedSource();
                }
              }}
              className={cn(
                "h-14 w-full rounded-2xl border bg-surface pl-12 pr-24 text-base text-ink",
                "placeholder:text-ink-subtle",
                "shadow-sm shadow-ink/5 transition-colors outline-none",
                "focus-visible:border-ink/40 focus-visible:ring-4 focus-visible:ring-ink/5",
              )}
            />
            <Button
              type="button"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              disabled={!paste.trim() || atCap || addSource.isPending}
              loading={addSource.isPending}
              onClick={addPastedSource}
            >
              Add
            </Button>
          </div>
          <p className="px-1 text-xs text-ink-subtle">
            {atCap
              ? `That's the maximum of ${maxSources} sources for this run.`
              : `${cards.length} of ${maxSources} sources. We read the page or captions, then you pick the angles.`}
          </p>
        </div>

        {cards.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {cards.map((card) => (
              <SourceCardRow
                key={card.id}
                card={card}
                onRemove={() => removeSource(card.id)}
              />
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="post_instruction" className="px-1 text-sm font-medium text-ink">
            Instruction
          </label>
          <Textarea
            id="post_instruction"
            placeholder="Optional steer — e.g. make this a founder story"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="flex min-w-40 flex-1 flex-col gap-1 px-1 text-sm font-medium text-ink">
            Suggestions
            <input
              type="range"
              min={1}
              max={maxSuggested}
              value={suggestCount}
              onChange={(event) => setSuggestCount(Number(event.target.value))}
              className="w-full accent-ink"
            />
            <span className="text-xs font-normal text-ink-subtle">
              {suggestCount} brief{suggestCount === 1 ? "" : "s"}
            </span>
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={sourceIds.length === 0 || suggest.isPending}
            loading={suggest.isPending}
            onClick={onSuggest}
          >
            Suggest
          </Button>
        </div>

        {suggestions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {suggestions.map((brief) => {
              const checked = selectedIds.has(brief.id);
              const sourceLabel = (brief.source_ids ?? [])
                .map((id) => sourceLabelFor(id))
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={brief.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors",
                      checked ? "border-ink bg-ink/3" : "border-border bg-surface",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-ink"
                      checked={checked}
                      onChange={() => toggleBrief(brief.id)}
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      {sourceLabel ? (
                        <span className="text-xs text-ink-subtle">
                          From {sourceLabel}
                        </span>
                      ) : null}
                      <span className="text-sm font-medium text-ink">{brief.headline}</span>
                      <span className="text-sm text-ink-muted">{brief.text}</span>
                      <span className="text-xs text-ink-subtle">{brief.reason}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-1 text-xs text-ink-subtle">
            Suggest first if you want to pick angles. Generate with none selected still drafts the default set.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-ink-muted">Settings</h2>

        <Ledger value={openRow} onValueChange={setOpenRow}>
          <LedgerRow label="Brand" htmlFor="post_brand">
            <Select
              id="post_brand"
              variant="bare"
              value={brandId}
              onChange={(event) => setBrandOverride(event.target.value)}
            >
              {brands.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </LedgerRow>

          <LedgerDisclosure
            id="format"
            label="Format"
            answer={format ? formatLabel(format) : "None enabled"}
          >
            <ChipGroup
              ariaLabel="Post format"
              options={allowedFormats}
              value={format ? [format] : []}
              onChange={(next) => setFormatOverride(next[0] as PostFormat)}
            />
            <p className="text-xs text-ink-subtle">
              {format
                ? `${formatDimensions(format)} · only the formats enabled on this brand appear here.`
                : "Enable a format on this brand to draft against it."}
            </p>
          </LedgerDisclosure>

          <LedgerDisclosure id="design" label="Design" answer={designAnswer}>
            <div
              role="radiogroup"
              aria-label="Design source"
              className="inline-flex w-fit rounded-xl border border-border bg-surface p-1"
            >
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === option.value}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition-colors",
                    mode === option.value ? "bg-ink text-bg" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <option.icon className="size-3.5" aria-hidden />
                  {option.label}
                </button>
              ))}
            </div>

            {mode === "pack" ? (
              packs.isPending ? (
                <Skeleton className="h-40" />
              ) : availablePacks.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface p-3.5 text-xs text-ink-muted">
                  {format
                    ? `No pack supports ${formatLabel(format)} yet. Pick another format, or use a single template.`
                    : "No packs available."}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <ChosenForYouButton
                    selected={!packId}
                    onSelect={() => setPackOverride("")}
                    meta="We pick the layout that fits the article"
                  />
                  <div className="grid grid-cols-2 items-start gap-2">
                    {availablePacks.map((item) => (
                      <DesignCard
                        key={item.id}
                        selected={packId === item.id}
                        onSelect={() => setPackOverride(item.id)}
                        title={item.label}
                        meta={`${item.pages} ${item.pages === 1 ? "page" : "pages"} · ${
                          item.images === 0
                            ? "text only"
                            : `${item.images} ${item.images === 1 ? "image" : "images"}`
                        }`}
                        description={item.description}
                        html={item.preview_html}
                        width={FORMAT_META[item.format]?.width ?? previewW}
                        height={FORMAT_META[item.format]?.height ?? previewH}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : templates.isPending ? (
              <Skeleton className="h-40" />
            ) : availableTemplates.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface p-3.5 text-xs text-ink-muted">
                No templates available.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <ChosenForYouButton
                  selected={!templateId}
                  onSelect={() => setTemplateOverride("")}
                  meta="We pick a single-page layout for the article"
                />
                <div className="grid grid-cols-2 items-start gap-2">
                  {availableTemplates.map((item) => (
                    <DesignCard
                      key={item.slug}
                      selected={templateId === item.slug}
                      onSelect={() => setTemplateOverride(item.slug)}
                      title={item.label || item.slug}
                      meta={formatLabel(item.format)}
                      description={item.description || undefined}
                      html={item.preview_html}
                      width={FORMAT_META[item.format]?.width ?? previewW}
                      height={FORMAT_META[item.format]?.height ?? previewH}
                    />
                  ))}
                </div>
              </div>
            )}
          </LedgerDisclosure>

          <LedgerDisclosure
            id="style"
            label="Photo style"
            answer={styleMeta?.label ?? imageStyle}
          >
            <StyleTiles value={imageStyle} onChange={setImageStyle} />
            <p className="text-xs text-ink-subtle">{styleMeta?.hint}</p>
          </LedgerDisclosure>

          <div className="px-1 py-3.5">
            <Toggle
              id="post_with_images"
              checked={withImages}
              onCheckedChange={setWithImages}
              label="Generate photos now"
              hint="Off keeps the first draft cheap — photos are filled in when the design is composed."
            />
          </div>
        </Ledger>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-xs text-ink-subtle">{summary}</p>
        <Button
          type="submit"
          size="lg"
          disabled={sourceIds.length === 0}
          loading={generate.isPending}
        >
          <Sparkles className="size-4" aria-hidden />
          Generate
        </Button>
      </div>
    </form>
  );
}

function SourceCardRow({
  card,
  onRemove,
}: {
  card: SourceCard;
  onRemove: () => void;
}) {
  const host = card.canonical_url ? hostnameOf(card.canonical_url) : null;
  const meta = [card.kind, host, card.duration].filter(Boolean).join(" · ");

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5">
      {card.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.thumbnail_url}
          alt=""
          className="size-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-ink/5 text-ink-subtle">
          <Link2 className="size-4" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {card.title || host || "Source"}
        </span>
        <span className="block truncate text-xs text-ink-subtle">
          {meta || card.excerpt}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-subtle hover:bg-ink/5 hover:text-ink"
        aria-label={`Remove ${card.title || "source"}`}
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

function ChosenForYouButton({
  selected,
  onSelect,
  meta,
}: {
  selected: boolean;
  onSelect: () => void;
  meta: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3.5 py-3 text-left transition-colors",
        selected ? "border-ink bg-ink/3" : "border-border bg-surface hover:border-ink/25",
      )}
    >
      {selected ? (
        <span
          aria-hidden
          className="grid size-4 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"
        >
          <Check className="size-2.5" strokeWidth={3.5} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">Chosen for you</span>
        <span className="text-xs text-ink-subtle">{meta}</span>
      </span>
    </button>
  );
}

function DesignCard({
  selected,
  onSelect,
  title,
  meta,
  description,
  html,
  width,
  height,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  meta: string;
  description?: string;
  html?: string;
  width: number;
  height: number;
}) {
  const hasPreview = Boolean(html?.trim());

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border text-left transition-colors",
        selected ? "border-ink bg-ink/3" : "border-border bg-surface hover:border-ink/25",
      )}
    >
      <div className="border-b border-border bg-ink/5">
        {hasPreview ? (
          <HtmlPreview
            html={html!}
            width={width}
            height={height}
            title={`${title} preview`}
            className="w-full"
            active
          />
        ) : (
          <div
            className="flex w-full items-center justify-center text-xs text-ink-subtle"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            No preview
          </div>
        )}
      </div>
      <span className="flex flex-col gap-1 px-3.5 py-3">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          {selected ? (
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"
            >
              <Check className="size-2.5" strokeWidth={3.5} />
            </span>
          ) : null}
          <span className="truncate">{title}</span>
        </span>
        <span className="text-xs text-ink-subtle">{meta}</span>
        {description ? (
          <span className="line-clamp-2 text-xs text-ink-muted">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
