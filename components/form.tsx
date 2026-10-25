import type { ReactNode } from "react";

const fieldClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20";

export const inputClass = `h-12 ${fieldClass}`;

export const textareaClass = `min-h-28 py-3 ${fieldClass}`;

export const selectClass = `${inputClass} appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10`;

// Native selects lose their arrow with appearance-none, so draw one
export const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20' stroke='%2371717a' stroke-width='1.5'%3E%3Cpath d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
};

export const primaryButtonClass =
    "inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-5 text-base font-medium text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

export const dangerButtonClass =
    "inline-flex h-12 w-full items-center justify-center rounded-xl border border-red-200 px-5 text-base font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50";

export const secondaryButtonClass =
    "inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

export const addButtonClass =
    "flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-50";

export const inlineEditButtonClass =
    "inline-flex h-9 shrink-0 items-center rounded-lg px-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {label}
            </label>
            {children}
            {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
        </div>
    );
}

export function FormError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {message}
        </p>
    );
}
