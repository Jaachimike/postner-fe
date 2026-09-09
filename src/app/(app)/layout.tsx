import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // A definite-height shell, with `main` as the scroll container rather than
    // the window. Long pages scroll exactly as before; what this buys is that a
    // page which should fit the screen — the review surface — can ask for
    // `h-full` and get a real number instead of "at least the viewport".
    //
    // `min-h-0` at every level of that column is what makes it work. Drop one
    // and the flex child stops being allowed to shrink below its content, so
    // the review card grows past the viewport and takes the FABs with it.
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-[17rem] shrink-0 border-r border-border lg:block">
        <AppSidebar />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
