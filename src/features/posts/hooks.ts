"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { components } from "@/lib/api/schema";
import type { FeedbackDecision, Post, Revision } from "@/lib/api/types";
import type { PostFormat } from "@/lib/formats";

type S = components["schemas"];

export function usePosts(options?: {
  refetchInterval?:
    | number
    | false
    | ((query: { state: { data: unknown } }) => number | false);
}) {
  return useQuery({
    queryKey: queryKeys.posts,
    queryFn: async () => {
      // The list endpoint omits page markup by default; the review queue
      // renders straight from this response (no per-post detail fetch), so
      // it opts back in.
      const result = await api.GET("/posts", {
        params: { query: { include: "html" } },
      });
      return unwrap<{ posts: Post[] }>(result).posts;
    },
    refetchInterval: options?.refetchInterval,
  });
}

export function usePost(
  postId: string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?:
      | number
      | false
      | ((query: { state: { data: unknown } }) => number | false);
  },
) {
  return useQuery({
    queryKey: queryKeys.post(postId ?? ""),
    enabled: Boolean(postId) && options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    queryFn: async () => {
      const result = await api.GET("/posts/{post_id}", {
        params: { path: { post_id: postId as string } },
      });
      return unwrap<Post>(result);
    },
  });
}

export function useRevisions(postId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.revisions(postId),
    enabled,
    queryFn: async () => {
      const result = await api.GET("/posts/{post_id}/revisions", {
        params: { path: { post_id: postId } },
      });
      return unwrap<{ revisions: Revision[] }>(result).revisions;
    },
  });
}

export function useRuns() {
  return useQuery({
    queryKey: queryKeys.runs,
    queryFn: async () => {
      const result = await api.GET("/runs");
      return unwrap<S["ListRunsResponse"]>(result);
    },
  });
}

export function useRun(runId: string | null) {
  return useQuery({
    queryKey: queryKeys.run(runId ?? ""),
    enabled: Boolean(runId),
    queryFn: async () => {
      const result = await api.GET("/runs/{run_id}", {
        params: { path: { run_id: runId as string } },
      });
      return unwrap<S["RunResponse"]>(result);
    },
  });
}

export function useCreateRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await api.POST("/runs");
      return unwrap<S["RunResponse"]>(result);
    },
    onSuccess: (run) => {
      queryClient.setQueryData(queryKeys.run(run.id), run);
      queryClient.invalidateQueries({ queryKey: queryKeys.runs });
    },
  });
}

export function useAddRunSource(runId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: S["IngestRequest"]) => {
      const result = await api.POST("/runs/{run_id}/sources", {
        params: { path: { run_id: runId as string } },
        body,
      });
      return unwrap<S["RunResponse"]>(result);
    },
    onSuccess: (run) => {
      queryClient.setQueryData(queryKeys.run(run.id), run);
      queryClient.invalidateQueries({ queryKey: queryKeys.runs });
    },
  });
}

export function usePatchRun(runId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: S["PatchRunRequest"]) => {
      const result = await api.PATCH("/runs/{run_id}", {
        params: { path: { run_id: runId as string } },
        body,
      });
      return unwrap<S["RunResponse"]>(result);
    },
    onSuccess: (run) => {
      queryClient.setQueryData(queryKeys.run(run.id), run);
      queryClient.invalidateQueries({ queryKey: queryKeys.runs });
    },
  });
}

export function useSuggestRun(runId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: S["SuggestRequest"]) => {
      const result = await api.POST("/runs/{run_id}/suggest", {
        params: { path: { run_id: runId as string } },
        body,
      });
      return unwrap<S["SuggestResponse"]>(result);
    },
    onSuccess: (data) => {
      if (!runId) return;
      queryClient.setQueryData(queryKeys.run(runId), (current: S["RunResponse"] | undefined) =>
        current ? { ...current, suggestions: data.suggestions } : current,
      );
    },
  });
}

export function useGenerateRun(runId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: S["GenerateRequest"]) => {
      const result = await api.POST("/runs/{run_id}/generate", {
        params: { path: { run_id: runId as string } },
        body,
      });
      return unwrap<S["GenerateResponse"]>(result);
    },
    onSuccess: (data) => {
      for (const post of data.posts) {
        queryClient.setQueryData(queryKeys.post(post.id), post);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

/** Shared cache write for every mutation that returns a refreshed post. */
function usePostMutation<TBody>(
  postId: string,
  run: (body: TBody) => Promise<Post>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (post) => {
      queryClient.setQueryData(queryKeys.post(postId), post);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      queryClient.invalidateQueries({ queryKey: queryKeys.revisions(postId) });
    },
  });
}

export function useGenerateImages(postId: string) {
  return usePostMutation<S["ImagesRequest"]>(postId, async (body) => {
    const result = await api.POST("/posts/{post_id}/images", {
      params: { path: { post_id: postId } },
      body,
    });
    return unwrap<Post>(result);
  });
}

/** Fills the template HTML for review. Does not rasterise anything. */
export function useCompose(postId: string) {
  return usePostMutation<S["ComposeRequest"]>(postId, async (body) => {
    const result = await api.POST("/posts/{post_id}/compose", {
      params: { path: { post_id: postId } },
      body,
    });
    return unwrap<Post>(result);
  });
}

/** Re-enqueue draft/compose after a pipeline failure (worker-owned path). */
export function useFinalizePost(postId: string) {
  return usePostMutation<undefined>(postId, async () => {
    const response = await fetch(`/api/proxy/posts/${encodeURIComponent(postId)}/finalize`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }
      const { ApiError, apiErrorMessage } = await import("@/lib/api/errors");
      throw new ApiError(
        apiErrorMessage(body, `Request failed (${response.status})`),
        response.status,
        body,
      );
    }
    return (await response.json()) as Post;
  });
}

/**
 * Runs Playwright and uploads the PNGs into `composed.renders`.
 *
 * Approving does not render. This is for an explicit re-render, or for the
 * download endpoint's cache miss.
 */
export function useRender(postId: string) {
  return usePostMutation<{ pages?: string[] | null; format?: PostFormat | null }>(
    postId,
    async (body) => {
      const result = await api.POST("/posts/{post_id}/render", {
        params: { path: { post_id: postId } },
        // Generated schema still types this as ComposeRequest; `format` is new.
        body: {
          ensure_images: true,
          pages: body.pages,
          format: body.format,
        } as S["ComposeRequest"],
      });
      return unwrap<Post>(result);
    },
  );
}

export function useRewrite(postId: string) {
  return usePostMutation<S["RewriteRequest"]>(postId, async (body) => {
    const result = await api.POST("/posts/{post_id}/rewrite", {
      params: { path: { post_id: postId } },
      body,
    });
    return unwrap<Post>(result);
  });
}

export function useRedesign(postId: string) {
  return usePostMutation<S["RedesignRequest"]>(postId, async (body) => {
    const result = await api.POST("/posts/{post_id}/redesign", {
      params: { path: { post_id: postId } },
      body,
    });
    return unwrap<Post>(result);
  });
}

export function useResize(postId: string) {
  return usePostMutation<{ format: PostFormat; pages?: string[] | null; apply_to_post?: boolean }>(
    postId,
    async (body) => {
      const result = await api.POST("/posts/{post_id}/resize", {
        params: { path: { post_id: postId } },
        body: { apply_to_post: true, ...body },
      });
      return unwrap<Post>(result);
    },
  );
}

export function useUndo(postId: string) {
  return usePostMutation<void>(postId, async () => {
    const result = await api.POST("/posts/{post_id}/undo", {
      params: { path: { post_id: postId } },
    });
    return unwrap<Post>(result);
  });
}

export function useFeedback(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      decision: FeedbackDecision;
      reasons?: string[];
      note?: string;
      page_id?: string | null;
    }) => {
      const result = await api.POST("/posts/{post_id}/feedback", {
        params: { path: { post_id: postId } },
        body: { reasons: [], note: "", ...body },
      });
      return unwrap<S["FeedbackResponse"]>(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}
