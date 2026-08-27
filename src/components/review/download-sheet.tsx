"use client";

import * as React from "react";
import Image from "next/image";
import { Download, ImageOff } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/feedback";
import { useResize } from "@/features/posts/hooks";
import { useBrands } from "@/features/brands/hooks";
import {
  FORMAT_META,
  formatDimensions,
  aspectRatio,
  type PostFormat,
} from "@/lib/formats";
import { composedPages, pageImageUrl, type Post } from "@/lib/api/types";
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
  const brands = useBrands();
  const [format, setFormat] = React.useState<PostFormat>(post.format);

  const brand = brands.data?.find((item) => item.id === post.brand_id);
  // Resize targets are constrained to what the brand has enabled.
  const options = ((brand?.formats as PostFormat[] | undefined) ?? [post.format]).map(
    (value) => ({ value, label: FORMAT_META[value].short }),
  );

  const pages = composedPages(post);
  const downloadable = pages.filter((page) => pageImageUrl(page));
  const needsResize = format !== post.format;

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
        <ErrorNote message={resize.isError ? toMessage(resize.error) : null} />

        <div
          className="relative w-full overflow-hidden rounded-xl border border-border bg-bg"
          style={{ aspectRatio: aspectRatio(post.format) }}
        >
          {pages[0] && pageImageUrl(pages[0]) ? (
            <Image
              src={pageImageUrl(pages[0]) as string}
              alt="Composed preview"
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 460px"
              className="object-contain"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1.5 px-6 text-center">
              <ImageOff className="size-5 text-ink-subtle" aria-hidden />
              <p className="text-xs text-ink-muted">
                Composed on the API&rsquo;s local disk — not downloadable until
                object storage is enabled.
              </p>
            </div>
          )}
        </div>

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
          <Button
            variant="secondary"
            loading={resize.isPending}
            onClick={() => resize.mutate({ format, apply_to_post: true })}
          >
            Re-render at {FORMAT_META[format].short}
          </Button>
        ) : null}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">
            {downloadable.length > 1 ? `${downloadable.length} slides` : "File"}
          </span>

          {downloadable.length === 0 ? (
            <p className="text-xs text-ink-subtle">
              Nothing to download yet.
            </p>
          ) : (
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
          )}
        </div>
      </div>
    </Sheet>
  );
}
