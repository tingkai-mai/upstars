"use client";
// Pieces shared by the worksheet and test builders
import { useState, useTransition, type ReactNode, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError, inputClass } from "@/components/form";

type Result = { error?: string };

/**
 * Saves the form, then navigates to doneHref. On success, onSaved resets the builder's own state:
 * Next keeps this page alive after leaving it, so the next visit should start fresh.
 */
export function useBuilderSubmit(action: (formData: FormData) => Promise<Result>, doneHref: string | ((formData: FormData) => string), onSaved: () => void) {
    const router = useRouter();
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setError(undefined);
        startTransition(async () => {
            const result = await action(formData);
            // State updates after an await must be wrapped again to stay in the transition; otherwise they
            // commit before the refreshed data does and the UI briefly shows stale values
            startTransition(() => {
                if (result.error) {
                    setError(result.error);
                    return;
                }
                form.reset();
                onSaved();
                router.push(typeof doneHref === "function" ? doneHref(formData) : doneHref);
            });
        });
    }

    return { error, pending, handleSubmit };
}

type NameAndTimeProps = {
    noun: string;
    namePlaceholder: string;
    timeHint: string;
    defaults: { name: string; durationMin?: number | null };
};

export function NameAndTimeFields({ noun, namePlaceholder, timeHint, defaults }: NameAndTimeProps) {
    return (
        <>
            <Field label={`${noun} name`} htmlFor="name">
                <input id="name" name="name" type="text" required autoComplete="off" defaultValue={defaults.name} placeholder={namePlaceholder} className={inputClass} />
            </Field>
            <Field label={`${noun} time (minutes, optional)`} htmlFor="durationMin" hint={timeHint}>
                <input id="durationMin" name="durationMin" type="number" inputMode="numeric" min={0} step={1} defaultValue={defaults.durationMin ?? undefined} className={inputClass} />
            </Field>
        </>
    );
}

const saveButtonClass =
    "inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-medium text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

type SaveBarProps = {
    summary: ReactNode;
    error?: string;
    pending: boolean;
    canSubmit: boolean;
    /** Shown instead of the summary while saving is disabled, saying what's missing */
    disabledHint: string;
    submitLabel: string;
};

/** Fixed to the bottom so Save and the running count stay reachable while scrolling. Pages using it add bottom padding. */
export function SaveBar({ summary, error, pending, canSubmit, disabledHint, submitLabel }: SaveBarProps) {
    return (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
            <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:px-2">
                <FormError message={error} />
                <div className="flex items-center gap-3">
                    <p className="flex-1 text-base text-zinc-700 dark:text-zinc-300" aria-live="polite">
                        {canSubmit ? summary : <span className="font-medium text-amber-800 dark:text-amber-300">{disabledHint}</span>}
                    </p>
                    <button type="submit" disabled={pending || !canSubmit} className={saveButtonClass}>
                        {pending ? "Saving…" : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
