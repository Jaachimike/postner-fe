"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { ErrorNote } from "@/components/ui/feedback";
import { FORMAT_META, POST_FORMATS, type PostFormat } from "@/lib/formats";
import { brandSchema, type BrandValues } from "@/features/brands/schema";
import { toMessage } from "@/lib/api/errors";
import type { Brand } from "@/lib/api/types";

const FORMAT_OPTIONS = POST_FORMATS.map((value) => ({
  value,
  label: FORMAT_META[value].label,
}));

export function BrandForm({
  brand,
  onSubmit,
  pending,
  error,
  submitLabel = "Save brand",
}: {
  brand?: Brand;
  onSubmit: (values: BrandValues) => void;
  pending: boolean;
  error?: unknown;
  submitLabel?: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: brand?.name ?? "",
      tagline: brand?.tagline ?? "",
      description: brand?.description ?? "",
      website: brand?.website ?? "",
      logo: brand?.logo ?? "",
      formats: (brand?.formats as PostFormat[] | undefined) ?? ["ig_feed"],
    },
  });

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <ErrorNote message={error ? toMessage(error) : null} />

      <Field label="Brand name" htmlFor="brand_name" error={errors.name?.message}>
        <Input
          id="brand_name"
          placeholder="Acme"
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>

      <Field label="Tagline" htmlFor="brand_tagline" optional>
        <Input id="brand_tagline" placeholder="Ship faster, explain less" {...register("tagline")} />
      </Field>

      <Field
        label="About"
        htmlFor="brand_description"
        optional
        hint="Feeds the model's sense of your voice — the more specific, the better the drafts."
      >
        <Textarea
          id="brand_description"
          rows={4}
          placeholder="What you make, who it's for, how you talk about it."
          {...register("description")}
        />
      </Field>

      <Field label="Website" htmlFor="brand_website" optional error={errors.website?.message}>
        <Input
          id="brand_website"
          inputMode="url"
          placeholder="https://example.com"
          aria-invalid={Boolean(errors.website)}
          {...register("website")}
        />
      </Field>

      <Field label="Logo URL" htmlFor="brand_logo" optional hint="A public image URL or storage key.">
        <Input id="brand_logo" placeholder="https://…/logo.svg" {...register("logo")} />
      </Field>

      <Controller
        control={control}
        name="formats"
        render={({ field }) => (
          <Field
            label="Enabled formats"
            htmlFor="brand_formats"
            error={errors.formats?.message}
            hint="New posts and resizes can only use these. The first one you pick is the default."
          >
            <div id="brand_formats">
              <ChipGroup
                ariaLabel="Enabled post formats"
                multiple
                options={FORMAT_OPTIONS}
                value={field.value}
                onChange={(next) => field.onChange(next)}
              />
            </div>
          </Field>
        )}
      />

      <div className="flex justify-end pt-1">
        <Button type="submit" size="lg" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
