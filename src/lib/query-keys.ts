export const queryKeys = {
  me: ["me"] as const,
  brands: ["brands"] as const,
  packs: ["packs"] as const,
  templates: ["templates"] as const,
  variants: (brandId: string | null) => ["variants", brandId] as const,
  posts: ["posts"] as const,
  post: (postId: string) => ["posts", postId] as const,
  revisions: (postId: string) => ["posts", postId, "revisions"] as const,
};
