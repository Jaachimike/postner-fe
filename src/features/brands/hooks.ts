"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { Brand, CreateBrandBody, PatchBrandBody } from "@/lib/api/types";

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands,
    queryFn: async () => {
      const result = await api.GET("/brands");
      return unwrap<{ brands: Brand[] }>(result).brands;
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
