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
                    className="-ml-1 inline-flex w-fit items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                    <span aria-hidden>←</span> {back.label}
                </Link>
            )}
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">{title}</h1>
                {action}
            </div>
        </header>
    );
}
