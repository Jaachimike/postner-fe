"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { ApiError, apiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type {
  Brand,
  CreateBrandBody,
  EnrichWebsiteBody,
  EnrichWebsiteOut,
  PatchBrandBody,
} from "@/lib/api/types";

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands,
    queryFn: async () => {
      const result = await api.GET("/brands");
      return unwrap<{ brands: Brand[] }>(result).brands;
    },
  });
}

export function useEnrichBrandAbout() {
  return useMutation({
    mutationFn: async (body: EnrichWebsiteBody) => {
      const result = await api.POST("/brands/enrich-from-website", { body });
      return unwrap<EnrichWebsiteOut>(result);
    },
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateBrandBody) => {
      const result = await api.POST("/brands", { body });
      return unwrap<Brand>(result);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.brands }),
  });
}

export function useUploadBrandLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ brandId, file }: { brandId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/brands/${encodeURIComponent(brandId)}/logo`, {
        method: "POST",
        body: formData,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError(
          apiErrorMessage(body, "Logo upload failed."),
          response.status,
          body,
        );
      }
      return body as Brand;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.brands }),
  });
}

export function useUpdateBrand(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PatchBrandBody) => {
      const result = await api.PATCH("/brands/{brand_id}", {
        params: { path: { brand_id: brandId } },
        body,
      });
      return unwrap<Brand>(result);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.brands }),
  });
}
