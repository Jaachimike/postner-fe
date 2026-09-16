"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_ASPECT_MIN = 0.85;
const LOGO_ASPECT_MAX = 1.15;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type LogoUploadState = {
  file: File | null;
  removeLogo: boolean;
};

async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

export async function validateLogoFile(file: File): Promise<string | null> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Use a PNG, JPEG, or WebP image.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return "Logo must be 5 MB or smaller.";
  }

  try {
    const { width, height } = await readImageDimensions(file);
    const ratio = width / height;
    if (!Number.isFinite(ratio) || ratio < LOGO_ASPECT_MIN || ratio > LOGO_ASPECT_MAX) {
      return "Logo should be roughly square (aspect ratio between 0.85 and 1.15).";
    }
  } catch {
    return "Could not read that image.";
  }

  return null;
}

export function LogoUpload({
  currentLogoUrl,
  file,
  removeLogo,
  onFileChange,
  onRemoveLogo,
  error,
  disabled,
}: {
  currentLogoUrl?: string | null;
  file: File | null;
  removeLogo: boolean;
  onFileChange: (file: File | null) => void;
  onRemoveLogo: () => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const previewUrl = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = removeLogo ? null : (previewUrl ?? currentLogoUrl ?? null);

  async function handleFiles(selected: FileList | null) {
    const next = selected?.[0];
    if (!next) return;

    const message = await validateLogoFile(next);
    if (message) {
      setLocalError(message);
      onFileChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLocalError(null);
    onFileChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface",
            !displayUrl && "text-ink-subtle",
          )}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6" aria-hidden />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (disabled) return;
              void handleFiles(event.dataTransfer.files);
            }}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-center transition-colors",
              !disabled && "hover:border-ink/20 hover:bg-ink/[0.02]",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="text-sm font-medium text-ink">
              {file ? "Replace logo" : "Upload logo"}
            </span>
            <span className="text-xs text-ink-muted">
              PNG, JPEG, or WebP · max 5 MB · roughly square
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => void handleFiles(event.target.files)}
          />

          {(currentLogoUrl || file) && !removeLogo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="self-start text-ink-muted"
              onClick={() => {
                setLocalError(null);
                onFileChange(null);
                onRemoveLogo();
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove logo
            </Button>
          ) : null}
        </div>
      </div>

      {localError || error ? (
        <p role="alert" className="text-xs text-reject">
          {localError ?? error}
        </p>
      ) : null}
    </div>
  );
}
