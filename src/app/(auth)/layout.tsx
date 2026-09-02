import {Logo} from "@/components/ui/logo";

export default function AuthLayout({children}: {children: React.ReactNode}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <Logo className="mb-8 h-10" />
      <div className="w-full max-w-[25rem] rounded-2xl border border-border bg-surface p-6 shadow-sm shadow-ink/5 sm:p-7">
        {children}
      </div>
    </main>
  );
}
