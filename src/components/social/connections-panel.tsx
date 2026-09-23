"use client";

import * as React from "react";
import { CalendarClock, Link2Off, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/feedback";
import { PostingScheduleSheet } from "@/components/social/posting-schedule-sheet";
import { PlatformIcon } from "@/components/social/platform-icon";
import { useConnections, useDisconnect } from "@/features/social/hooks";
import { toMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import {
  PLATFORM_META,
  isActiveConnection,
  isPlatform,
  platformLabel,
  type Connection,
  type Platform,
} from "@/lib/api/types";

/**
 * Start the Meta consent flow.
 *
 * A real anchor, not a fetch: it has to be a top-level navigation, and the BFF
 * route is what attaches the JWT the API demands — see
 * `src/app/api/social/connect/route.ts` for why it cannot go through the
 * ordinary proxy.
 */
function connectHref(brandId: string, platform: Platform): string {
  return (
    `/api/social/connect?brandId=${encodeURIComponent(brandId)}` +
    `&platform=${encodeURIComponent(platform)}`
  );
}

export function ConnectionsPanel({ brandId }: { brandId: string }) {
  const connections = useConnections(brandId);
  const disconnect = useDisconnect(brandId);
  const [scheduling, setScheduling] = React.useState<Connection | null>(null);
  const [confirming, setConfirming] = React.useState<string | null>(null);

  const connectButtons = (
    <div className="flex flex-wrap gap-2">
      {(["instagram", "facebook"] as const).map((platform) => (
        <Button key={platform} asChild variant="secondary">
          <a href={connectHref(brandId, platform)}>
            <PlatformIcon platform={platform} />
            {PLATFORM_META[platform].connectLabel}
          </a>
        </Button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {connections.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : connections.isError ? (
        <ErrorNote message={toMessage(connections.error)} />
      ) : connections.data.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No accounts connected"
          body="Connect this brand's Instagram or Facebook to set a weekly posting schedule and publish approved posts on a timer. Tokens belong to the brand, so anyone on the team can schedule against them."
          action={connectButtons}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {connections.data.map((connection) => {
              const active = isActiveConnection(connection);
              return (
                <li
                  key={connection.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-bg text-ink">
                    {isPlatform(connection.platform) ? (
                      <PlatformIcon platform={connection.platform} />
                    ) : (
                      <Plug className="size-4" aria-hidden />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {connection.display_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                      <span>{platformLabel(connection.platform)}</span>
                      <span aria-hidden>·</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          active ? "text-ink-muted" : "text-reject",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            active ? "bg-approve" : "bg-reject",
                          )}
                          aria-hidden
                        />
                        {active ? "Active" : "Needs reconnecting"}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {active ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setScheduling(connection)}
                      >
                        <CalendarClock className="size-4" aria-hidden />
                        Posting schedule
                      </Button>
                    ) : (
                      <Button asChild variant="secondary" size="sm">
                        <a href={connectHref(brandId, connection.platform)}>Reconnect</a>
                      </Button>
                    )}

                    {confirming === connection.id ? (
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          loading={disconnect.isPending}
                          onClick={() =>
                            disconnect.mutate(connection.id, {
                              onSuccess: () => setConfirming(null),
                            })
                          }
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirming(null)}
                        >
                          Keep
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirming(connection.id)}
                      >
                        <Link2Off className="size-4" aria-hidden />
                        Disconnect
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <ErrorNote message={disconnect.error ? toMessage(disconnect.error) : null} />
          {connectButtons}
        </>
      )}

      {scheduling ? (
        <PostingScheduleSheet
          brandId={brandId}
          connection={scheduling}
          onClose={() => setScheduling(null)}
        />
      ) : null}
    </div>
  );
}
