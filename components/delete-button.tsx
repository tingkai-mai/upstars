"use client";
import { useActionState } from "react";
import { dangerButtonClass, FormError } from "@/components/form";

type Props = {
    action: (prev: { error?: string }) => Promise<{ error?: string }>;
    label: string;
    confirm: string;
};

export function DeleteButton({ action, label, confirm: confirmMessage }: Props) {
    const [state, formAction, pending] = useActionState(action, {});

    return (
        <form
            action={formAction}
            onSubmit={(event) => {
                if (!confirm(confirmMessage)) event.preventDefault();
            }}
            className="flex flex-col gap-3"
        >
            <FormError message={state.error} />
            <button type="submit" disabled={pending} className={dangerButtonClass}>
                {pending ? "Deleting…" : label}
            </button>
        </form>
    );
}
