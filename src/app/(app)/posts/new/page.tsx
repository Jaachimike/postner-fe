import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { NewPostForm } from "@/features/posts/new-post-form";
import { Skeleton } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeader
        title="New post"
        description="Point us at a URL. We read it, write the copy, and design the slides."
      />
      {/* `useSearchParams` in the form needs this boundary. */}
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <NewPostForm />
      </Suspense>
    </div>
  );
}
