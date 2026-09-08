import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // A definite-height shell, with `main` as the scroll container rather than
    // the window. Long pages scroll exactly as before; what this buys is that a
    // page which should fit the screen — the review surface — can ask for
    // `h-full` and get a real number instead of "at least the viewport".
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        {children}
      </main>
    </div>
  );
}
