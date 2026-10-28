import type { ReactNode } from "react";

/** A bordered list of items, one per row; each row is usually a CompletionRow. */
export function CompletionList({ label, children }: { label: string; children: ReactNode }) {
    return (
        <ul aria-label={label} className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {children}
        </ul>
    );
}

export const completionItemClass = "px-4 py-3";

/** Dates are shown in Singapore time, where Upstars operates. */
export function formatCompletedOn(date: Date) {
    return date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
}

export function CompletedOn({ date }: { date: Date }) {
    return <span className="mt-1 block text-base font-medium text-emerald-700 dark:text-emerald-400">Done on {formatCompletedOn(date)}</span>;
}
