import type { ReactNode } from "react";

type AccordionProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    /** Smaller, filled style for an accordion inside another */
    nested?: boolean;
    defaultOpen?: boolean;
    children: ReactNode;
};

/** A native <details> accordion: works without JavaScript and keeps its open state when Next preserves the page. */
export function Accordion({ title, subtitle, nested = false, defaultOpen, children }: AccordionProps) {
    return (
        <details open={defaultOpen} className={`group/accordion rounded-2xl ${nested ? "bg-zinc-50 dark:bg-zinc-900/60" : "border border-zinc-200 dark:border-zinc-800"}`}>
            <summary
                className={`flex cursor-pointer list-none items-center gap-3 rounded-2xl transition [&::-webkit-details-marker]:hidden ${
                    nested ? "px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/60" : "p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
            >
                <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold text-zinc-900 dark:text-zinc-50 ${nested ? "text-base" : "text-lg"}`}>{title}</h3>
                    {/* A div, not a p: subtitles can hold block content such as a progress bar */}
                    {subtitle && <div className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</div>}
                </div>
                <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5 shrink-0 text-zinc-600 transition group-open/accordion:rotate-180 dark:text-zinc-400">
                    <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </summary>
            <div className={`flex flex-col gap-3 ${nested ? "px-4 pb-4" : "border-t border-zinc-200 p-3 sm:p-4 dark:border-zinc-800"}`}>{children}</div>
        </details>
    );
}

export function EmptyState({ children }: { children: ReactNode }) {
    return <div className="rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-base text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{children}</div>;
}

/** [3, 1, 2] → "Weeks 1–3", [4] → "Week 4", [1, 3] → "Weeks 1, 3", [] → "No weeks" */
export function formatWeeks(numbers: number[]) {
    const weeks = [...new Set(numbers)].sort((a, b) => a - b);
    if (weeks.length === 0) return "No weeks";
    if (weeks.length === 1) return `Week ${weeks[0]}`;
    const consecutive = weeks.every((w, i) => i === 0 || w === weeks[i - 1] + 1);
    return consecutive ? `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}` : `Weeks ${weeks.join(", ")}`;
}
