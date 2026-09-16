import { LayoutGrid, CircleCheck, Palette } from "lucide-react";

/**
 * The sidebar's destinations, in pipeline order: what is being made, what came
 * out, and the brand every post is made against.
 *
 * Review is deliberately absent — it sits above this list as a call to action
 * with a live count, because working through the queue is the loop the product
 * runs on (architecture.md §3.6), not one destination among several.
 *
 * Everything about the nav reads from here: the rail, the mobile drawer, and
 * the active-route match. Adding a screen is one entry.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/drafts", label: "Drafts", icon: LayoutGrid },
  { href: "/approved", label: "Approved", icon: CircleCheck },
  { href: "/brands", label: "Brands", icon: Palette },
];

/**
 * Longest-prefix match, so `/brands` does not light up while the deeper route
 * that starts with the same characters is open.
 */
export function activeNavHref(pathname: string): string | null {
  const matches = NAV_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).map((item) => item.href);
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}
