"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/form";

type Props = {
    /** A Server Action bound to what it changes, e.g. resetSyllabus.bind(null, studentId, subjectId) */
    action: () => Promise<{ error?: string }>;
    children: ReactNode;
    pendingLabel: string;
    className: string;
    /** Asked before running, for changes that are hard to undo */
    confirm?: string;
    /** Where to go once it succeeds. Navigating here rather than with redirect() in the action keeps it in this transition. */
    successHref?: string;
};

/** A button that runs a Server Action, showing progress on the button and any error under it. */
export function ActionButton({ action, children, pendingLabel, className, confirm: confirmMessage, successHref }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string>();

    function run() {
        if (pending || (confirmMessage && !confirm(confirmMessage))) return;
        setError(undefined);
        startTransition(async () => {
            const result = await action();
            startTransition(() => {
                setError(result.error);
                if (!result.error && successHref) router.replace(successHref, { scroll: false });
            });
        });
    }

    return (
        <div className="flex flex-col gap-2">
            <button type="button" onClick={run} disabled={pending} className={className}>
                {pending ? pendingLabel : children}
            </button>
            <FormError message={error} />
        </div>
    );
}
