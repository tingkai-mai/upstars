import Link from "next/link";

type Tab = { label: string; href: string; active: boolean };

export function Tabs({ label, tabs }: { label: string; tabs: Tab[] }) {
    return (
        <nav aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-zinc-100 p-1 sm:w-fit sm:min-w-72 dark:bg-zinc-900">
            {tabs.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={tab.active ? "page" : undefined}
                    className={`flex h-12 items-center justify-center rounded-lg px-2 text-sm font-medium transition sm:px-4 sm:text-base ${
                        tab.active
                            ? "bg-white font-semibold text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                            : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
}
