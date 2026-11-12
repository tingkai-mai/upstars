import type { ReactNode } from "react";
import Link from "next/link";
import { SectionIcon, type SectionKey } from "@/lib/sections";

type Props = {
    title: string;
    /** A line under the title, e.g. who or what the page is for */
    subtitle?: ReactNode;
    back?: { href: string; label: string };
    /** The page's main action, e.g. Add user */
    action?: ReactNode;
    /** Shows the section's coloured icon, matching its home-page tile */
    section?: SectionKey;
};

export function PageHeader({ title, subtitle, back, action, section }: Props) {
    return (
        <>
            {back && (
                // Sticks to the top, so the way back is always in reach on long pages
                <div className="sticky top-0 z-20 -mx-4 -my-3 bg-white/95 px-4 py-1 backdrop-blur sm:-mx-6 sm:px-6 dark:bg-zinc-950/95">
                    <Link
                        href={back.href}
                        className="-ml-2 inline-flex h-11 max-w-full items-center gap-2 rounded-lg px-2 text-base font-medium text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                    >
                        <span aria-hidden className="text-xl leading-none">
                            ←
                        </span>
                        <span className="truncate">Back to {back.label}</span>
                    </Link>
                </div>
            )}
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    {section && <SectionIcon section={section} />}
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">{title}</h1>
                        {subtitle && <div className="mt-1 text-base text-zinc-600 dark:text-zinc-400">{subtitle}</div>}
                    </div>
                </div>
                {action}
            </header>
        </>
    );
}
