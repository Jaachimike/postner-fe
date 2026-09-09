"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Menu } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { AppSidebar } from "@/components/layout/app-sidebar";

/**
 * The small-screen top bar, and nothing else.
 *
 * Below `lg` there is no room for a permanent rail, so the same sidebar is
 * rendered inside a left drawer. Radix's Dialog is doing the work that matters
 * — focus trap, scroll lock, escape and outside-click — which is why this is a
 * dialog rather than a div that slides.
 *
 * It is not `sticky`: `main` is the scroll container, and this sits outside it
 * as a flex sibling, so it stays put without being taken out of flow.
 */
export function AppHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          aria-label="Open navigation"
          className="-ml-1.5 rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Menu className="size-5" aria-hidden />
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[17rem] max-w-[85vw] shadow-2xl shadow-ink/20 outline-none">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Move between drafts, the review queue, approved posts and brands.
            </Dialog.Description>
            {/* Closing on navigation matters here and nowhere else: on desktop
                the rail persists, so `onNavigate` is left undefined there. */}
            <AppSidebar onNavigate={() => setOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Link href="/drafts" aria-label="Postner — drafts" className="rounded-lg">
        <Logo className="h-5" />
      </Link>
    </header>
  );
}
