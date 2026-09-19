"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wand2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { ErrorNote } from "@/components/ui/feedback";
import { LogoUpload, type LogoUploadState } from "@/components/brand/logo-upload";
import { FORMAT_META, POST_FORMATS, type PostFormat } from "@/lib/formats";
import { brandSchema, type BrandValues } from "@/features/brands/schema";
import { useEnrichBrandAbout } from "@/features/brands/hooks";
import { toMessage } from "@/lib/api/errors";
import type { Brand } from "@/lib/api/types";

const FORMAT_OPTIONS = POST_FORMATS.map((value) => ({
  value,
  label: FORMAT_META[value].label,
}));

const WEBSITE_RE = /^https?:\/\/\S+$/i;

export type BrandFormSubmit = BrandValues & LogoUploadState;

export function BrandForm({
  brand,
  onSubmit,
  pending,
  error,
  submitLabel = "Save brand",
}: {
  brand?: Brand;
  onSubmit: (values: BrandFormSubmit) => void | Promise<void>;
  pending: boolean;
  error?: unknown;
  submitLabel?: string;
}) {
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = React.useState(false);
  const enrich = useEnrichBrandAbout();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    setError,
    formState: { errors },
  } = useForm<BrandValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: brand?.name ?? "",
      tagline: brand?.tagline ?? "",
      description: brand?.description ?? "",
      website: brand?.website ?? "",
      formats: (brand?.formats as PostFormat[] | undefined) ?? ["ig_feed"],
    },
  });

  async function generateAbout() {
    const url = (getValues("website") ?? "").trim();
    if (!WEBSITE_RE.test(url)) {
      await trigger("website");
      if (!url) {
        setError("website", {
          type: "manual",
          message: "Add a website URL first.",
        });
      }
      return;
    }

    const current = (getValues("description") ?? "").trim();
    if (current) {
      const replace = window.confirm(
        "Replace the current About with a draft from this website?",
      );
      if (!replace) return;
    }

    try {
      const result = await enrich.mutateAsync({
        website: url,
        brand_name: (getValues("name") ?? "").trim(),
      });
      setValue("description", result.description, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch {
      // Surfaced via enrich.isError
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) =>
        onSubmit({ ...values, file: logoFile, removeLogo }),
      )}
      noValidate
    >
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

      <Field label="Website" htmlFor="brand_website" optional error={errors.website?.message}>
        <Input
          id="brand_website"
          inputMode="url"
          placeholder="https://example.com"
          aria-invalid={Boolean(errors.website)}
          {...register("website")}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          loading={enrich.isPending}
          disabled={pending}
          onClick={() => void generateAbout()}
        >
          <Wand2 className="size-4" aria-hidden />
          Generate about
        </Button>
        {enrich.isError ? <ErrorNote message={toMessage(enrich.error)} /> : null}
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

      <Field
        label="Logo"
        htmlFor="brand_logo"
        optional
        hint="Square-ish PNG, JPEG, or WebP. Stored on your brand profile for post chrome."
      >
        <LogoUpload
          currentLogoUrl={brand?.logo}
          file={logoFile}
          removeLogo={removeLogo}
          disabled={pending}
          onFileChange={(file) => {
            setLogoFile(file);
            if (file) setRemoveLogo(false);
          }}
          onRemoveLogo={() => setRemoveLogo(true)}
        />
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
