"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { Pack, Variant } from "@/lib/api/types";

export function usePacks() {
  return useQuery({
    queryKey: queryKeys.packs,
    queryFn: async () => {
      const result = await api.GET("/packs");
      return unwrap<{ packs: Pack[] }>(result).packs;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: async () => {
      const result = await api.GET("/templates");
      return unwrap<{ ids: string[] }>(result).ids;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useVariants(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.variants(brandId),
    enabled: Boolean(brandId),
    queryFn: async () => {
      const result = await api.GET("/variants", {
        params: { query: { brand_id: brandId as string } },
      });
      return unwrap<{ variants: Variant[] }>(result).variants;
    },
    staleTime: 60 * 1000,
  });
}
