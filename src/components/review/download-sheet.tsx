"use client";

import * as React from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { ErrorNote, Spinner } from "@/components/ui/feedback";
import { HtmlPreview } from "@/components/ui/html-preview";
import { useRender, useResize } from "@/features/posts/hooks";
import { useBrands } from "@/features/brands/hooks";
import {
  FORMAT_META,
  formatDimensions,
  aspectRatio,
  type PostFormat,
} from "@/lib/formats";
import {
  composedPages,
  downloadablePages,
  pageDimensions,
  pageImageUrl,
  pagePreviewHtml,
  type Post,
} from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";

export function DownloadSheet({
  post,
  open,
  onOpenChange,
  onDone,
}: {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const resize = useResize(post.id);
  const render = useRender(post.id);
  const brands = useBrands();
  const [format, setFormat] = React.useState<PostFormat>(post.format);

  const brand = brands.data?.find((item) => item.id === post.brand_id);
  // Resize targets are constrained to what the brand has enabled.
  const options = ((brand?.formats as PostFormat[] | undefined) ?? [post.format]).map(
    (value) => ({ value, label: FORMAT_META[value].short }),
  );

  const pages = composedPages(post);
  const downloadable = downloadablePages(post);
  const needsResize = format !== post.format;
  const busy = resize.isPending || render.isPending;

  const first = pages[0];
  const firstUrl = first ? pageImageUrl(first) : null;
  const firstHtml = first ? pagePreviewHtml(first) : null;
  const firstSize = first ? pageDimensions(first, post.format) : null;

  /**
   * A resize re-fills the HTML and drops the PNGs, so the files have to be
   * rebuilt before there is anything to download.
   */
  function resizeAndRender() {
    resize.mutate(
      { format, apply_to_post: true },
      { onSuccess: () => render.mutate({}) },
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Download"
      description="Approved. Pick a size and grab the files."
      footer={
        <Button variant="ghost" className="w-full" onClick={onDone}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <ErrorNote
          message={
            resize.isError
              ? toMessage(resize.error)
              : render.isError
                ? toMessage(render.error)
                : null
          }
        />

        {/* Prefer the rendered PNG — it is the artefact being downloaded. Fall
            back to the design itself while the render is still catching up. */}
        {firstUrl ? (
          <div
            className="relative w-full overflow-hidden rounded-xl border border-border bg-bg"
            style={{ aspectRatio: aspectRatio(post.format) }}
          >
            <Image
              src={firstUrl}
              alt="Rendered preview"
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 460px"
              className="object-contain"
            />
          </div>
        ) : firstHtml && firstSize ? (
          <HtmlPreview
            html={firstHtml}
            width={firstSize.width}
            height={firstSize.height}
            title="Design preview"
            className="rounded-xl border border-border bg-bg"
          />
        ) : null}

        <Field label="Size" htmlFor="dl_format" hint={formatDimensions(format)}>
          <div id="dl_format">
            <ChipGroup
              ariaLabel="Download size"
              options={options}
              value={[format]}
              onChange={(next) => setFormat(next[0] as PostFormat)}
            />
          </div>
        </Field>

        {needsResize ? (
          <Button variant="secondary" loading={busy} onClick={resizeAndRender}>
            Re-render at {FORMAT_META[format].short}
          </Button>
        ) : null}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">
            {downloadable.length > 1 ? `${downloadable.length} slides` : "File"}
          </span>

          {downloadable.length > 0 ? (
            downloadable.map((page, index) => (
              <a
                key={page.page_id}
                href={`/api/download/${post.id}/${encodeURIComponent(page.page_id)}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-ink/25"
              >
                <span className="min-w-0 truncate text-ink">
                  {downloadable.length > 1 ? `Slide ${index + 1}` : "Composed image"}
                  <span className="ml-2 text-ink-subtle">{page.page_id}</span>
                </span>
                <Download className="size-4 shrink-0 text-ink-muted" aria-hidden />
              </a>
            ))
          ) : render.isPending ? (
            <p className="flex items-center gap-2 text-xs text-ink-subtle">
              <Spinner />
              Rendering the files…
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-ink-subtle">
                No files yet — approving builds them.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                loading={render.isPending}
                onClick={() => render.mutate({})}
              >
                Render now
              </Button>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
