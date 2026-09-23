"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNote, Skeleton } from "@/components/ui/feedback";
import { ConnectionsPanel } from "@/components/social/connections-panel";
import { PagePickerSheet } from "@/components/social/page-picker-sheet";
import { useBrands } from "@/features/brands/hooks";
import { isPlatform } from "@/lib/api/types";

/**
 * A brand's connected social accounts — and the landing pad for the OAuth
 * round trip.
 *
 * The API redirects Meta's callback straight to this path with either
 * `?oauth=meta&nonce=…&platform=…` or `?oauth=meta&error=…`, so the route has
 * to exist at exactly this shape; see `app/social/routes_oauth.py`.
 */
export default function BrandConnectionsPage() {
  return (
    // `useSearchParams` opts a route into dynamic rendering, and Next requires
    // the boundary rather than inferring it.
    <React.Suspense fallback={<Skeleton className="h-40 rounded-2xl" />}>
      <Connections />
    </React.Suspense>
  );
}

function Connections() {
  const brandId = String(useParams().id ?? "");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const brands = useBrands();

  const brand = brands.data?.find((item) => item.id === brandId);
  const nonce = searchParams.get("nonce");
  const platformParam = searchParams.get("platform");
  const platform = isPlatform(platformParam) ? platformParam : null;
  const error = searchParams.get("error");

  /** Drop the one-shot OAuth params so a reload does not replay the return. */
  const clearOAuthParams = React.useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return (
    <div className="flex flex-col">
      <Link
        href="/brands"
        className="inline-flex w-fit items-center gap-1.5 pb-4 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to brands
      </Link>

      <PageHeader
        title="Connections"
        description={
          brand
            ? `Instagram and Facebook accounts ${brand.name} posts as.`
            : "Instagram and Facebook accounts this brand posts as."
        }
      />

      {error ? (
        <ErrorNote
          className="mb-4"
          message={`Could not connect that account — ${error}`}
        />
      ) : null}

      <ConnectionsPanel brandId={brandId} />

      {nonce && platform ? (
        <PagePickerSheet
          brandId={brandId}
          nonce={nonce}
          platform={platform}
          onClose={clearOAuthParams}
          onConnected={clearOAuthParams}
        />
      ) : null}
    </div>
  );
}
