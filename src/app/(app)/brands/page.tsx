"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, Skeleton, ErrorNote } from "@/components/ui/feedback";
import { BrandForm, type BrandFormSubmit } from "@/components/brand/brand-form";
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useUploadBrandLogo,
} from "@/features/brands/hooks";
import { FORMAT_META, type PostFormat } from "@/lib/formats";
import { toMessage } from "@/lib/api/errors";
import type { Brand } from "@/lib/api/types";

export default function BrandsPage() {
  const brands = useBrands();
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Brands"
        description="Every post is drafted and designed against one brand."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            New brand
          </Button>
        }
      />

      {brands.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : brands.isError ? (
        <ErrorNote message={toMessage(brands.error)} />
      ) : brands.data.length === 0 ? (
        <EmptyState
          title="No brands yet"
          body="Create your first brand to unlock post drafting. There is no demo brand — the model needs your name, voice, and formats to write anything useful."
          action={<Button onClick={() => setCreating(true)}>Create your brand</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {brands.data.map((brand) => (
            <li
              key={brand.id}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-ink/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {brand.logo ? (
                    <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={brand.logo}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-ink">{brand.name}</h2>
                    {brand.tagline ? (
                      <p className="mt-0.5 truncate text-sm text-ink-muted">{brand.tagline}</p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(brand)}
                  aria-label={`Edit ${brand.name}`}
                  className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(brand.formats ?? []).map((format, index) => (
                  <span
                    key={format}
                    className={
                      index === 0
                        ? "rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-ink"
                        : "rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted"
                    }
                  >
                    {FORMAT_META[format as PostFormat]?.short ?? format}
                    {index === 0 ? " · default" : ""}
                  </span>
                ))}
              </div>

              <Link
                href={`/posts/new?brand=${brand.id}`}
                className="mt-auto text-sm font-medium text-ink underline-offset-4 hover:underline"
              >
                Draft a post →
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateBrandSheet open={creating} onOpenChange={setCreating} />
      <EditBrandSheet brand={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function brandBody(values: BrandFormSubmit) {
  return {
    name: values.name,
    tagline: values.tagline ?? "",
    description: values.description ?? "",
    website: values.website,
    formats: values.formats,
  };
}

function CreateBrandSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateBrand();
  const uploadLogo = useUploadBrandLogo();
  const pending = create.isPending || uploadLogo.isPending;
  const error = create.error ?? uploadLogo.error;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          create.reset();
          uploadLogo.reset();
        }
        onOpenChange(next);
      }}
      title="New brand"
      description="Starter colour palettes are seeded automatically."
    >
      <BrandForm
        pending={pending}
        error={error}
        submitLabel="Create brand"
        onSubmit={async (values) => {
          const brand = await create.mutateAsync(brandBody(values));
          if (values.file) {
            await uploadLogo.mutateAsync({ brandId: brand.id, file: values.file });
          }
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}

function EditBrandSheet({ brand, onClose }: { brand: Brand | null; onClose: () => void }) {
  if (!brand) return null;
  return <EditBrandSheetInner brand={brand} onClose={onClose} />;
}

function EditBrandSheetInner({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const update = useUpdateBrand(brand.id);
  const uploadLogo = useUploadBrandLogo();
  const pending = update.isPending || uploadLogo.isPending;
  const error = update.error ?? uploadLogo.error;

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()} title={`Edit ${brand.name}`}>
      <BrandForm
        brand={brand}
        pending={pending}
        error={error}
        onSubmit={async (values) => {
          const body = brandBody(values);
          if (values.removeLogo) {
            await update.mutateAsync({ ...body, logo: "" });
          } else {
            await update.mutateAsync(body);
          }
          if (values.file) {
            await uploadLogo.mutateAsync({ brandId: brand.id, file: values.file });
          }
          onClose();
        }}
      />
    </Sheet>
  );
}
