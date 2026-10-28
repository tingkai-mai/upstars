import type { ReactNode } from "react";

/** Groups a page's pickers (student, level, subject…) into one box, so they read as "what you're looking at". */
export function FilterPanel({ children }: { children: ReactNode }) {
    return <div className="flex flex-col gap-3 rounded-2xl bg-zinc-100 p-3 sm:p-4 dark:bg-zinc-900">{children}</div>;
}
