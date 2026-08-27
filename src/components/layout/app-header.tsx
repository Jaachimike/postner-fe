"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils/cn";
import { useLogout } from "@/features/auth/hooks";

const NAV = [
  { href: "/review", label: "Review" },
  { href: "/posts/new", label: "New post" },
  { href: "/brands", label: "Brands" },
];

export function AppHeader() {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link href="/review" className="shrink-0 rounded-lg">
          <Logo className="text-base text-ink" />
        </Link>

        <nav aria-label="Main" className="ml-2 flex min-w-0 items-center gap-0.5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-ink/[0.06] font-medium text-ink"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50"
        >
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
