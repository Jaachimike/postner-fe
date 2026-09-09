import { redirect } from "next/navigation";

/**
 * Drafts, not the review queue.
 *
 * With a persistent rail the queue is one click away and carries its own
 * count, so landing on the overview says what is going on before deciding what
 * to work on. Before the rail existed the queue was the only sensible door.
 */
export default function Home() {
  redirect("/drafts");
}
