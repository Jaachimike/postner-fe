"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, apiErrorMessage } from "@/lib/api/errors";
import type { Me } from "@/lib/api/types";

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const result = await api.GET("/auth/me");
      return unwrap<Me>(result);
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Credentials go to the BFF, not the API — the route handler exchanges them
 * and puts the JWT in an httpOnly cookie the browser cannot read.
 */
async function exchange(path: "login" | "register", body: unknown) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(
      apiErrorMessage(payload, "Could not sign you in."),
      response.status,
      payload,
    );
  }
  return payload as { user_id: string; tenant_id: string };
}

export function useLogin(next: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => exchange("login", body),
    onSuccess: () => {
      queryClient.clear();
      router.replace(next);
      router.refresh();
    },
  });
}

export function useRegister(next: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; name?: string }) =>
      exchange("register", body),
    onSuccess: () => {
      queryClient.clear();
      router.replace(next);
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
  });
}
