import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
    title: string;
    back?: { href: string; label: string };
    action?: ReactNode;
};

export function PageHeader({ title, back, action }: Props) {
    return (
        <header className="flex flex-col gap-3">
            {back && (
                <Link
                    href={back.href}
                    className="-ml-2 inline-flex h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-base font-medium text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                    <span aria-hidden>←</span> {back.label}
                </Link>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">{title}</h1>
                {action}
            </div>
        </header>
    );
}
