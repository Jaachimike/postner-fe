"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PostGrid } from "@/components/post/post-tile";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
import { usePosts } from "@/features/posts/hooks";
import { useBrands } from "@/features/brands/hooks";
import { isApproved, type Post } from "@/lib/api/types";
import { toMessage } from "@/lib/api/errors";

/**
 * What came out the other end.
 *
 * Not "Live" — Postner does not publish. These are approved and rendered,
 * waiting for you to download them and post them yourself.
 */
export default function ApprovedPage() {
  const posts = usePosts();
  const brands = useBrands();

  const approved = React.useMemo(
    () =>
      (posts.data ?? [])
        .filter((post: Post) => isApproved(post))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [posts.data],
  );

  return (
    <>
      <PageHeader
        title="Approved"
        description="Signed off and rendered. Open one to download the files."
      />

      {posts.isPending ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <li key={key}>
              <Skeleton className="h-80 rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : posts.isError ? (
        <ErrorNote message={toMessage(posts.error)} />
      ) : approved.length === 0 ? (
        <EmptyState
          variant="bare"
          icon={CircleCheck}
          title="Nothing approved yet"
          body="Approve a post in the review queue and it moves here with its files rendered."
          action={
            <Button asChild variant="secondary">
              <Link href="/review">Open the review queue</Link>
            </Button>
          }
        />
      ) : (
        <PostGrid posts={approved} brands={brands.data} />
      )}
    </>
  );
}
