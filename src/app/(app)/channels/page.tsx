import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/feedback";

/**
 * Where a Meta sign-in that failed early lands.
 *
 * The API's OAuth callback redirects to `{FRONTEND_PUBLIC_URL}/channels` for the
 * three failures it hits *before* it can decode the signed state — Meta returned
 * an error, `code`/`state` were missing, or the state did not verify — because
 * at that point it does not know which brand the attempt was for. Every later
 * failure knows, and goes to that brand's connections page instead.
 *
 * So this is not a screen the product has; it is the one place a brandless
 * failure can be explained. Reached with no error at all, it is someone typing
 * the URL, and Brands is where they meant to go.
 */
export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) redirect("/brands");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Connection failed"
        description="Meta did not complete the sign-in, so nothing was connected."
      />
      <ErrorNote message={error} />
      <div className="pt-4">
        <Button asChild variant="secondary">
          <Link href="/brands">Back to brands</Link>
        </Button>
      </div>
    </div>
  );
}
