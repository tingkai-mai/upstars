import Link from "next/link";

type Tab = { label: string; href: string; active: boolean };

export const tabClass = "flex h-12 items-center justify-center rounded-lg px-2 text-base font-medium transition sm:px-4";
export const activeTabClass = "bg-white font-semibold text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50";
export const inactiveTabClass = "text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50";

export function Tabs({ label, tabs }: { label: string; tabs: Tab[] }) {
    // More than three tabs wrap to two rows on phones, so labels stay full size
    const layout = tabs.length > 3 ? "grid-cols-2 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none" : "auto-cols-fr grid-flow-col";
    return (
        <nav aria-label={label} className={`grid gap-1 rounded-xl bg-zinc-100 p-1 sm:w-fit sm:min-w-72 dark:bg-zinc-900 ${layout}`}>
            {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} aria-current={tab.active ? "page" : undefined} className={`${tabClass} ${tab.active ? activeTabClass : inactiveTabClass}`}>
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
}
