"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { ErrorNote, Spinner } from "@/components/ui/feedback";
import { useBrands } from "@/features/brands/hooks";
import { apiErrorMessage } from "@/lib/api/errors";
import { type Post } from "@/lib/api/types";
import {
  FORMAT_META,
  isPostFormat,
  type PostFormat,
} from "@/lib/formats";
import { cn } from "@/lib/utils/cn";

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const starred = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (starred?.[1]) return decodeURIComponent(starred[1].trim().replaceAll('"', ""));
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() ?? fallback;
}

async function downloadApproved(postId: string, format?: string) {
  const search = format ? `?format=${encodeURIComponent(format)}` : "";
  const response = await fetch(`/api/download/${encodeURIComponent(postId)}${search}`);
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    throw new Error(apiErrorMessage(body, `Download failed (${response.status})`));
  }
  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get("content-disposition"),
    `post-${postId.slice(0, 8)}.png`,
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DownloadApprovedButton({
  postId,
  format,
  variant = "button",
  className,
}: {
  postId: string;
  format?: string;
  variant?: "button" | "overlay";
  className?: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await downloadApproved(postId, format);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed");
    } finally {
      setPending(false);
    }
  }

  if (variant === "overlay") {
    return (
      <div className={cn("flex flex-col items-end gap-1", className)}>
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          aria-label={pending ? "Preparing download" : "Download"}
          title="Download"
          className={cn(
            "grid size-10 place-items-center rounded-full border border-border bg-surface",
            "text-ink shadow-sm transition-colors hover:border-ink/30",
            "disabled:cursor-wait disabled:opacity-70",
          )}
        >
          {pending ? (
            <Spinner className="size-4" />
          ) : (
            <Download className="size-4" aria-hidden strokeWidth={2.25} />
          )}
        </button>
        {error ? (
          <p className="max-w-[10rem] rounded-lg bg-surface/95 px-2 py-1 text-xs text-reject">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button type="button" onClick={onClick} loading={pending} className="self-center">
        <Download className="size-4" aria-hidden />
        Download
      </Button>
      <ErrorNote message={error} />
    </div>
  );
}

export function ApprovedDownloadBar({ post }: { post: Post }) {
  const brands = useBrands();
  const brand = brands.data?.find((item) => item.id === post.brand_id);
  const [format, setFormat] = React.useState<PostFormat>(post.format);
  const options = (
    (brand?.formats as PostFormat[] | undefined) ?? [post.format]
  )
    .filter(isPostFormat)
    .map((value) => ({ value, label: FORMAT_META[value].short }));

  return (
    <div className="flex w-full max-w-[34rem] shrink-0 flex-col items-center gap-3">
      {options.length > 1 ? (
        <ChipGroup
          ariaLabel="Download size"
          options={options}
          value={[format]}
          onChange={(next) => setFormat((next[0] as PostFormat) ?? post.format)}
        />
      ) : null}
      <DownloadApprovedButton postId={post.id} format={format} />
    </div>
  );
}
