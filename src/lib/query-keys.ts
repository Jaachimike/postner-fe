export const queryKeys = {
  me: ["me"] as const,
  brands: ["brands"] as const,
  packs: ["packs"] as const,
  templates: ["templates"] as const,
  posts: ["posts"] as const,
  post: (postId: string) => ["posts", postId] as const,
  revisions: (postId: string) => ["posts", postId, "revisions"] as const,
  runs: ["runs"] as const,
  run: (runId: string) => ["runs", runId] as const,

  // Social. Connection-scoped keys nest under their brand so disconnecting a
  // brand's account invalidates its schedule and next-slot with one prefix.
  connections: (brandId: string) => ["brands", brandId, "connections"] as const,
  connection: (brandId: string, connectionId: string) =>
    ["brands", brandId, "connections", connectionId] as const,
  postingSchedule: (brandId: string, connectionId: string) =>
    ["brands", brandId, "connections", connectionId, "posting-schedule"] as const,
  nextSlot: (brandId: string, connectionId: string) =>
    ["brands", brandId, "connections", connectionId, "next-slot"] as const,
  metaPages: (brandId: string, nonce: string) =>
    ["brands", brandId, "oauth-pages", nonce] as const,
  scheduledPosts: (brandId?: string) =>
    brandId ? (["scheduled-posts", brandId] as const) : (["scheduled-posts"] as const),
};
