"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Images, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ChipGroup } from "@/components/ui/chip";
import { Toggle } from "@/components/ui/switch";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
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

export function NewPostForm() {
  const router = useRouter();
  const params = useSearchParams();
  const brands = useBrands();
  const packs = usePacks();
  const templates = useTemplates();
  const createPost = useCreatePost();

  const [url, setUrl] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>("pack");
  const [packOverride, setPackOverride] = React.useState("");
  const [templateId, setTemplateId] = React.useState("basic");
  const [withImages, setWithImages] = React.useState(false);

  // Brand and format are held as overrides and resolved against live data
  // below, so that changing brand cannot strand a format the brand disallows.
  // Image style needs none of that: it is a fixed set, not brand-scoped.
  const [brandOverride, setBrandOverride] = React.useState(params.get("brand") ?? "");
  const [formatOverride, setFormatOverride] = React.useState<PostFormat | "">("");
  const [imageStyle, setImageStyle] = React.useState<ImageStyle>("realistic");

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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^https?:\/\/\S+$/i.test(url.trim())) {
      setUrlError("Enter a full URL, for example https://example.com/post");
      return;
    }
    setUrlError(null);
    createPost.mutate(
      {
        url: url.trim(),
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
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <ErrorNote message={createPost.isError ? toMessage(createPost.error) : null} />

      <Field
        label="Source URL"
        htmlFor="post_url"
        error={urlError ?? undefined}
        hint="The page to turn into a post. We scrape it, then draft from what is actually there."
      >
        <Input
          id="post_url"
          inputMode="url"
          placeholder="https://example.com/blog/shipping-faster"
          value={url}
          aria-invalid={Boolean(urlError)}
          onChange={(event) => setUrl(event.target.value)}
        />
      </Field>

      <Field label="Brand" htmlFor="post_brand">
        <Select
          id="post_brand"
          value={brandId}
          onChange={(event) => setBrandOverride(event.target.value)}
        >
          {brands.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-ink">Design</span>
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
              {availablePacks.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  aria-pressed={packId === pack.id}
                  onClick={() => setPackOverride(pack.id)}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors",
                    packId === pack.id
                      ? "border-ink bg-ink/[0.03]"
                      : "border-border bg-surface hover:border-ink/25",
                  )}
                >
                  <span className="text-sm font-medium text-ink">{pack.label}</span>
                  <span className="text-xs text-ink-subtle">
                    {pack.pages} {pack.pages === 1 ? "page" : "pages"}
                    {" · "}
                    {pack.images === 0
                      ? "text only"
                      : `${pack.images} ${pack.images === 1 ? "image" : "images"}`}
                  </span>
                  {pack.description ? (
                    <span className="line-clamp-2 text-xs text-ink-muted">
                      {pack.description}
                    </span>
                  ) : null}
                </button>
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
      </div>

      <Field
        label="Format"
        htmlFor="post_format"
        hint={
          format
            ? formatDimensions(format)
            : "Only the formats enabled on this brand appear here."
        }
      >
        <div id="post_format">
          <ChipGroup
            ariaLabel="Post format"
            options={allowedFormats}
            value={format ? [format] : []}
            onChange={(next) => setFormatOverride(next[0] as PostFormat)}
          />
        </div>
      </Field>

      <Field
        label="Photo style"
        htmlFor="post_image_style"
        hint={IMAGE_STYLES.find((style) => style.value === imageStyle)?.hint}
      >
        <div id="post_image_style">
          <ChipGroup
            ariaLabel="Photo style"
            options={IMAGE_STYLES.map(({ value, label }) => ({ value, label }))}
            value={[imageStyle]}
            onChange={(next) => setImageStyle(next[0] as ImageStyle)}
          />
        </div>
      </Field>

      <div className="rounded-xl border border-border bg-surface p-4">
        <Toggle
          id="post_with_images"
          checked={withImages}
          onCheckedChange={setWithImages}
          label="Generate photos during the draft"
          hint="Leaving this off keeps the first draft cheap — photos are filled in automatically when the design is composed."
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={createPost.isPending}>
          <Sparkles className="size-4" aria-hidden />
          Generate
        </Button>
      </div>
    </form>
  );
}
