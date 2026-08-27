import { Suspense } from "react";
import type { Metadata } from "next";
import { NewPostForm } from "@/features/posts/new-post-form";
import { Skeleton } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">New post</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Point us at a URL. We read it, draft the copy, and design the slides.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <NewPostForm />
      </Suspense>
    </div>
  );
}
