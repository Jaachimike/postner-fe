"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { Pack, TemplateSummary } from "@/lib/api/types";
import type { PostFormat } from "@/lib/formats";

type TemplateDetail = {
  slug: string;
  label: string;
  description: string;
  format: PostFormat;
  html: string;
  preview_html?: string;
  is_system?: boolean;
};

type PackDetail = Pack & { preview_html?: string };

/** Same-origin BFF fetch for catalog detail paths not yet in generated OpenAPI. */
async function proxyJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function toTemplateSummary(detail: TemplateDetail): TemplateSummary {
  return {
    slug: detail.slug,
    label: detail.label || detail.slug,
    description: detail.description || "",
    format: detail.format,
    preview_html: detail.preview_html || detail.html || "",
    is_system: Boolean(detail.is_system),
  };
}

async function hydrateTemplates(
  listed: TemplateSummary[],
  ids: string[],
): Promise<TemplateSummary[]> {
  const base =
    listed.length > 0
      ? listed
      : ids.map(
          (slug): TemplateSummary => ({
            slug,
            label: slug,
            description: "",
            format: "ig_feed",
            preview_html: "",
            is_system: true,
          }),
        );

  return Promise.all(
    base.map(async (item) => {
      if (item.preview_html?.trim()) return item;
      try {
        const detail = await proxyJson<TemplateDetail>(
          `/templates/${encodeURIComponent(item.slug)}`,
        );
        return toTemplateSummary(detail);
      } catch {
        return item;
      }
    }),
  );
}

async function hydratePacks(listed: Pack[]): Promise<Pack[]> {
  return Promise.all(
    listed.map(async (item) => {
      if (item.preview_html?.trim()) return item;
      try {
        const detail = await proxyJson<PackDetail>(
          `/packs/${encodeURIComponent(item.id)}`,
        );
        return { ...item, ...detail, preview_html: detail.preview_html || "" };
      } catch {
        return item;
      }
    }),
  );
}

export function usePacks() {
  return useQuery({
    queryKey: queryKeys.packs,
    queryFn: async () => {
      const result = await api.GET("/packs");
      const packs = unwrap<{ packs: Pack[] }>(result).packs ?? [];
      return hydratePacks(packs);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: async () => {
      const result = await api.GET("/templates");
      const body = unwrap<{ templates?: TemplateSummary[]; ids?: string[] }>(result);
      return hydrateTemplates(body.templates ?? [], body.ids ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });
}
