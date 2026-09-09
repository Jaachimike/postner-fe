"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Images, Layers, Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ChipGroup } from "@/components/ui/chip";
import { Ledger, LedgerDisclosure, LedgerRow } from "@/components/ui/ledger";
import { Toggle } from "@/components/ui/switch";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
import { StyleTiles } from "@/components/post/style-tile";
import { cn } from "@/lib/utils/cn";
import { FORMAT_META, formatDimensions, formatLabel, type PostFormat } from "@/lib/formats";
import { toMessage } from "@/lib/api/errors";
import { useBrands } from "@/features/brands/hooks";
import { usePacks, useTemplates } from "@/features/catalog/hooks";
import { useCreatePost } from "@/features/posts/hooks";
import { IMAGE_STYLES, type ImageStyle } from "@/lib/api/types";

type Mode = "pack" | "template";

const MODE_OPTIONS = [
  { value: "pack", label: "Carousel pack", icon: Layers },
  { value: "template", label: "Single template", icon: Images },
] as const;

const URL_RE = /^https?:\/\/\S+$/i;

/** The host, for echoing back what we are about to read. Null if unparseable. */
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
  const createPost = useCreatePost();

  const [url, setUrl] = React.useState("");
  const [urlTouched, setUrlTouched] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("pack");
  const [packOverride, setPackOverride] = React.useState("");
  const [templateId, setTemplateId] = React.useState("basic");
  const [withImages, setWithImages] = React.useState(false);

  // Which ledger row is open, or "" for none. One at a time is the point: the
  // list is meant to be read at a glance, and three open panels destroy that.
  const [openRow, setOpenRow] = React.useState("");

  // Brand and format are held as overrides and resolved against live data
  // below, so that changing brand cannot strand a format the brand disallows.
  // Image style needs none of that: it is a fixed set, not brand-scoped.
  const [brandOverride, setBrandOverride] = React.useState(params.get("brand") ?? "");
  const [formatOverride, setFormatOverride] = React.useState<PostFormat | "">("");
  const [imageStyle, setImageStyle] = React.useState<ImageStyle>("realistic");

  const trimmedUrl = url.trim();
  const urlValid = URL_RE.test(trimmedUrl);
  const host = urlValid ? hostnameOf(trimmedUrl) : null;
  const urlError =
    urlTouched && trimmedUrl.length > 0 && !urlValid
      ? "That is not a full URL — it needs to start with https://"
      : null;

  const brandId = brandOverride || brands.data?.[0]?.id || "";
  const brand = brands.data?.find((item) => item.id === brandId);

  const allowed = (brand?.formats ?? []) as PostFormat[];
  const format: PostFormat | "" =
    formatOverride && allowed.includes(formatOverride)
      ? formatOverride
      : (allowed[0] ?? "");

  // Packs now declare the formats they support, so offer only the ones that
  // fit. A pack composed for 4:5 has roughly a third of the vertical room at
  // 16:9, and the layouts do not survive it — better to hide the pack than to
  // draw it at a shape it was never designed for. Resolved like the format
  // above, so switching format cannot strand a pack that no longer applies.
  const availablePacks = (packs.data ?? []).filter(
    (pack) => !format || pack.formats.includes(format),
  );
  const packId = availablePacks.some((pack) => pack.id === packOverride)
    ? packOverride
    : "";
  const pack = availablePacks.find((item) => item.id === packId);

  if (brands.isPending) return <Skeleton className="h-96 rounded-2xl" />;
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

  // No pack picked means `pack_id: null`, and the API chooses one. That is a
  // real answer, so the row says so rather than nagging for a decision that
  // does not need making.
  const designAnswer =
    mode === "template" ? templateId : pack ? pack.label : "Chosen for you";

  const styleMeta = IMAGE_STYLES.find((style) => style.value === imageStyle);

  const summary = [
    pack ? `${pack.pages} pages` : "Layout chosen for you",
    format ? formatDimensions(format) : null,
    withImages ? "photos with the draft" : "photos at compose",
  ]
    .filter(Boolean)
    .join(" · ");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setUrlTouched(true);
    if (!urlValid) return;
    createPost.mutate(
      {
        url: trimmedUrl,
        brand_id: brandId || null,
        pack_id: mode === "pack" ? packId || null : null,
        template_id: mode === "template" ? templateId || null : null,
        format: (format || null) as PostFormat | null,
        image_style: imageStyle,
        with_images: withImages,
      },
      { onSuccess: (post) => router.push(`/posts/${post.id}`) },
    );
  }

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={submit}
      // Enter already submits from the URL field. This is for the rest of the
      // form, where focus sits on a button that would otherwise swallow it.
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.currentTarget.requestSubmit();
        }
      }}
      noValidate
    >
      <ErrorNote message={createPost.isError ? toMessage(createPost.error) : null} />

      {/* The one loud control. Everything below it is a preference; this is the
          instruction, so it is the only thing on the page at this weight. */}
      <div className="flex flex-col gap-2">
        <label htmlFor="post_url" className="sr-only">
          Article URL
        </label>
        <div className="relative">
          <Link2
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 transition-colors",
              urlValid ? "text-accent" : "text-ink-subtle",
            )}
          />
          <input
            id="post_url"
            inputMode="url"
            autoFocus
            placeholder="Paste an article URL"
            value={url}
            aria-invalid={Boolean(urlError)}
            aria-describedby="post_url_note"
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => setUrlTouched(true)}
            className={cn(
              "h-14 w-full rounded-2xl border bg-surface pl-12 pr-4 text-base text-ink",
              "placeholder:text-ink-subtle",
              "shadow-sm shadow-ink/5 transition-colors outline-none",
              "focus-visible:border-ink/40 focus-visible:ring-4 focus-visible:ring-ink/5",
              "aria-[invalid=true]:border-reject",
            )}
          />
        </div>

        {/* The host is the only thing we honestly know before the API scrapes
            the page — so it is what gets echoed back, not a guessed title. */}
        <p
          id="post_url_note"
          className={cn("px-1 text-xs", urlError ? "text-reject" : "text-ink-subtle")}
          role={urlError ? "alert" : undefined}
        >
          {urlError ?? (host ? `Reading ${host}` : "We read the page, then draft from what is actually there.")}
        </p>
      </div>

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
                <Skeleton className="h-28" />
              ) : availablePacks.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface p-3.5 text-xs text-ink-muted">
                  {format
                    ? `No pack supports ${formatLabel(format)} yet. Pick another format, or use a single template.`
                    : "No packs available."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {/* Clearing back to auto has to be reachable, or the first
                      pack you tap becomes permanent. */}
                  <PackCard
                    selected={!packId}
                    onSelect={() => setPackOverride("")}
                    title="Chosen for you"
                    meta="We pick the layout that fits the article"
                  />
                  {availablePacks.map((item) => (
                    <PackCard
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
                    />
                  ))}
                </div>
              )
            ) : (
              <Select
                aria-label="Template"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                {(templates.data ?? ["basic"]).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </Select>
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

      {/* What is about to happen, then the button that does it. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-xs text-ink-subtle">{summary}</p>
        <Button
          type="submit"
          size="lg"
          disabled={!urlValid}
          loading={createPost.isPending}
        >
          <Sparkles className="size-4" aria-hidden />
          Generate
        </Button>
      </div>
    </form>
  );
}

function PackCard({
  selected,
  onSelect,
  title,
  meta,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  meta: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors",
        selected ? "border-ink bg-ink/3" : "border-border bg-surface hover:border-ink/25",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
        {selected ? (
          <span
            aria-hidden
            className="grid size-4 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"
          >
            <Check className="size-2.5" strokeWidth={3.5} />
          </span>
        ) : null}
        {title}
      </span>
      <span className="text-xs text-ink-subtle">{meta}</span>
      {description ? (
        <span className="line-clamp-2 text-xs text-ink-muted">{description}</span>
      ) : null}
    </button>
  );
}
