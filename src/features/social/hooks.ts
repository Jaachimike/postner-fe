"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { ApiError, apiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type {
  CompleteConnectionBody,
  Connection,
  MetaPage,
  NextSlot,
  PostingSchedule,
  PostingScheduleBody,
  SchedulePostBody,
  ScheduledPost,
} from "@/lib/api/types";

/* ---------------------------------------------------------------------------
   Connections
--------------------------------------------------------------------------- */

export function useConnections(brandId: string) {
  return useQuery({
    queryKey: queryKeys.connections(brandId),
    enabled: Boolean(brandId),
    queryFn: async () => {
      const result = await api.GET("/brands/{brand_id}/connections", {
        params: { path: { brand_id: brandId } },
      });
      return unwrap<{ connections: Connection[] }>(result).connections;
    },
  });
}

/**
 * The Pages this OAuth round-trip turned up.
 *
 * `retry: false` and `staleTime: Infinity` are load-bearing: the nonce names a
 * single-use pending session on the API, and React Query's default retries
 * would spend it on a transient failure and leave the user with an expired
 * session they cannot get back without reconnecting.
 */
export function useMetaPages(brandId: string, nonce: string | null) {
  return useQuery({
    queryKey: queryKeys.metaPages(brandId, nonce ?? ""),
    enabled: Boolean(brandId && nonce),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const result = await api.GET("/brands/{brand_id}/oauth/meta/pages", {
        params: { path: { brand_id: brandId }, query: { nonce: nonce ?? "" } },
      });
      return unwrap<{ pages: MetaPage[]; platform: string }>(result);
    },
  });
}

export function useCompleteConnection(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CompleteConnectionBody) => {
      const result = await api.POST("/brands/{brand_id}/connections", {
        params: { path: { brand_id: brandId } },
        body,
      });
      return unwrap<Connection>(result);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.connections(brandId) }),
  });
}

/**
 * Soft-revoke a connection.
 *
 * A bare `fetch` rather than the typed client: the API answers 204 with no
 * body, and openapi-fetch parses the response against the declared JSON
 * content type. Loosening the proxy to accommodate one empty response would be
 * the wrong trade — it is the thing keeping non-JSON off this origin.
 */
export function useDisconnect(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(
        `/api/proxy/brands/${encodeURIComponent(brandId)}` +
          `/connections/${encodeURIComponent(connectionId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        throw new ApiError(
          apiErrorMessage(body, "Could not disconnect that account."),
          response.status,
          body,
        );
      }
      return connectionId;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.connections(brandId) }),
  });
}

/* ---------------------------------------------------------------------------
   Weekly posting schedule
--------------------------------------------------------------------------- */

export function usePostingSchedule(brandId: string, connectionId: string) {
  return useQuery({
    queryKey: queryKeys.postingSchedule(brandId, connectionId),
    enabled: Boolean(brandId && connectionId),
    queryFn: async () => {
      const result = await api.GET(
        "/brands/{brand_id}/connections/{connection_id}/posting-schedule",
        { params: { path: { brand_id: brandId, connection_id: connectionId } } },
      );
      return unwrap<PostingSchedule>(result);
    },
  });
}

/** Saving a schedule moves the next slot, so both keys go. */
function invalidateSchedule(
  queryClient: ReturnType<typeof useQueryClient>,
  brandId: string,
  connectionId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.postingSchedule(brandId, connectionId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.nextSlot(brandId, connectionId),
    }),
  ]);
}

export function useSavePostingSchedule(brandId: string, connectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PostingScheduleBody) => {
      const result = await api.PUT(
        "/brands/{brand_id}/connections/{connection_id}/posting-schedule",
        {
          params: { path: { brand_id: brandId, connection_id: connectionId } },
          body,
        },
      );
      return unwrap<PostingSchedule>(result);
    },
    onSuccess: () => invalidateSchedule(queryClient, brandId, connectionId),
  });
}

export function useResetPostingSchedule(brandId: string, connectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await api.POST(
        "/brands/{brand_id}/connections/{connection_id}/posting-schedule/reset",
        { params: { path: { brand_id: brandId, connection_id: connectionId } } },
      );
      return unwrap<PostingSchedule>(result);
    },
    onSuccess: () => invalidateSchedule(queryClient, brandId, connectionId),
  });
}

/**
 * When this account would next post on its own schedule.
 *
 * Never cached: the answer is a datetime that the API refuses once it is in the
 * past, so a stale one seeds the Schedule sheet with a value guaranteed to be
 * rejected.
 */
export function useNextSlot(
  brandId: string,
  connectionId: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.nextSlot(brandId, connectionId),
    enabled: (options.enabled ?? true) && Boolean(brandId && connectionId),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const result = await api.GET(
        "/brands/{brand_id}/connections/{connection_id}/next-slot",
        { params: { path: { brand_id: brandId, connection_id: connectionId } } },
      );
      return unwrap<NextSlot>(result);
    },
  });
}

/* ---------------------------------------------------------------------------
   One-off scheduled publishes
--------------------------------------------------------------------------- */

/**
 * Scheduled publishes, newest first.
 *
 * `limit` is the API's own ceiling (200; its default is 50). This feeds status
 * badges on a grid rather than a queue screen, so it is one page deliberately —
 * a brand with more than 200 scheduled publishes would show no badge on the
 * oldest of them, which is the point at which the calendar page the brief
 * defers becomes the right answer instead of paging here.
 */
export function useScheduledPosts(brandId?: string) {
  return useQuery({
    queryKey: queryKeys.scheduledPosts(brandId),
    queryFn: async () => {
      const result = await api.GET("/scheduled-posts", {
        params: { query: { ...(brandId ? { brand_id: brandId } : {}), limit: 200 } },
      });
      return unwrap<{ items?: ScheduledPost[] }>(result).items ?? [];
    },
  });
}

export function useSchedulePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SchedulePostBody) => {
      const result = await api.POST("/scheduled-posts", { body });
      return unwrap<ScheduledPost>(result);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts() }),
  });
}

export function useReschedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      scheduledId,
      scheduledAt,
    }: {
      scheduledId: string;
      scheduledAt: string;
    }) => {
      const result = await api.PATCH("/scheduled-posts/{scheduled_id}", {
        params: { path: { scheduled_id: scheduledId } },
        body: { scheduled_at: scheduledAt },
      });
      return unwrap<ScheduledPost>(result);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts() }),
  });
}

export function useCancelScheduled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduledId: string) => {
      const result = await api.DELETE("/scheduled-posts/{scheduled_id}", {
        params: { path: { scheduled_id: scheduledId } },
      });
      return unwrap<ScheduledPost>(result);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts() }),
  });
}
