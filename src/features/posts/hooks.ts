"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { components } from "@/lib/api/schema";
import type { FeedbackDecision, Post, Revision } from "@/lib/api/types";
import type { PostFormat } from "@/lib/formats";

type S = components["schemas"];

export function usePosts() {
  return useQuery({
    queryKey: queryKeys.posts,
    queryFn: async () => {
      const result = await api.GET("/posts");
      return unwrap<{ posts: Post[] }>(result).posts;
    },
  });
}

export function usePost(postId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.post(postId ?? ""),
    enabled: Boolean(postId) && options?.enabled !== false,
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

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: S["CreatePostRequest"]) => {
      const result = await api.POST("/posts", { body });
      return unwrap<Post>(result);
    },
    onSuccess: (post) => {
      queryClient.setQueryData(queryKeys.post(post.id), post);
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

export function useCompose(postId: string) {
  return usePostMutation<S["ComposeRequest"]>(postId, async (body) => {
    const result = await api.POST("/posts/{post_id}/compose", {
      params: { path: { post_id: postId } },
      body,
    });
    return unwrap<Post>(result);
  });
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
