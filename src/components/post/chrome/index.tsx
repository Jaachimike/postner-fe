import { FbChrome } from "@/components/post/chrome/fb-chrome";
import { IgChrome } from "@/components/post/chrome/ig-chrome";
import { PostnerChrome } from "@/components/post/chrome/postner-chrome";
import { TikTokChrome } from "@/components/post/chrome/tiktok-chrome";
import { XChrome } from "@/components/post/chrome/x-chrome";
import type { ChromeComponent, PostChromeProps } from "@/components/post/chrome/types";
import { platformOf, type Platform } from "@/lib/formats";

/**
 * The review card wears the chrome of the platform the post is going to.
 *
 * Not decoration: a draft judged in the wrong frame is judged against the wrong
 * constraints. An Instagram carousel reviewed as a tweet hides that the caption
 * sits below the image and that the first slide is the whole first impression.
 *
 * The spec each chrome implements:
 *
 * |            | IG feed/portrait      | IG story    | Facebook           | X                     | TikTok            |
 * |------------|-----------------------|-------------|--------------------|-----------------------|-------------------|
 * | tone       | light                 | dark        | light              | dark                  | dark              |
 * | avatar     | 32px, gradient ring   | 32px, ring  | 40px plain         | 40px plain            | rail + "+" badge  |
 * | name       | username              | username    | full name          | name and @handle      | @handle           |
 * | tick       | ig-accent             | ig-accent   | fb-accent          | x-accent              | none              |
 * | caption    | below media           | overlaid    | above media        | above media           | overlaid          |
 * | glyphs     | heart/comment/send    | send/save   | Like/Comment/Share | reply/repost/like/... | vertical rail     |
 * | media      | full-bleed            | full-bleed  | full-bleed         | inset + border        | full-bleed        |
 *
 * Two rules hold across all of them:
 *
 *  - Padding belongs to the chrome, not the shell, because only X insets its
 *    media. `CardShell` is `overflow-hidden` so the rest can run to the edge.
 *  - Postner's own metadata (format label, source attribution) is *not* in
 *    here. It lives under the card in app tokens — no real Instagram post says
 *    "Instagram portrait · 3 slides", and putting it inside would undo the
 *    impersonation this whole layer exists for.
 *
 * `Record<Platform, …>` is deliberate: adding a platform to the union is a
 * compile error until its chrome exists.
 */
const CHROME: Record<Platform, ChromeComponent> = {
  instagram: IgChrome,
  facebook: FbChrome,
  x: XChrome,
  tiktok: TikTokChrome,
};

export function PostChrome(props: PostChromeProps) {
  const platform = platformOf(props.post.format);
  const Chrome = platform ? CHROME[platform] : PostnerChrome;
  return <Chrome {...props} />;
}
