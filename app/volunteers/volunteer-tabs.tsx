import Link from "next/link";

const TABS = [
    { key: "users", label: "Users", href: "/volunteers" },
    { key: "pairings", label: "Pairings", href: "/volunteers/pairings" },
] as const;

export function VolunteerTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
    return (
        <nav aria-label="Volunteer management" className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 sm:w-fit sm:min-w-72 dark:bg-zinc-900">
            {TABS.map((tab) => {
                const isActive = tab.key === active;
                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex h-10 items-center justify-center rounded-lg text-sm font-medium transition ${
                            isActive
                                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
