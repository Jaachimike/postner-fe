import type { Brand, Post } from "@/lib/api/types";

/** Who the post appears to be from. Derived once, so every chrome agrees. */
export interface PostIdentity {
  displayName: string;
  /** Includes the leading "@". */
  handle: string;
  logo: string | null;
  /** First letter, for the no-logo fallback. */
  initial: string;
}

export interface PostChromeProps {
  post: Post;
  brand?: Brand;
  identity: PostIdentity;
  /**
   * The caption the post publishes with — constant across slides. The copy
   * printed *on* a slide is the carousel's business, not the chrome's.
   */
  caption: string;
  /**
   * The carousel, already built. Chrome decides where it sits and what
   * surrounds it, and never constructs it — the frame's aspect ratio has to
   * stay stable across slides, which only the carousel can guarantee.
   */
  media: React.ReactNode;
  /** False in the "needs rebuilding" / "not ready" states. */
  hasDesign: boolean;
  className?: string;
}

export type ChromeComponent = React.ComponentType<PostChromeProps>;
