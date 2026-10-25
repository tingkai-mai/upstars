"use client";
import { useActionState } from "react";
import { dangerButtonClass, FormError } from "@/components/form";
import type { ActionState } from "./actions";

type Props = {
    action: (prev: ActionState) => Promise<ActionState>;
    name: string;
};

export function DeleteUserButton({ action, name }: Props) {
    const [state, formAction, pending] = useActionState(action, {});

    return (
        <form
            action={formAction}
            onSubmit={(event) => {
                if (!confirm(`Delete ${name}? Their pairings will be removed too. This can't be undone.`)) event.preventDefault();
            }}
            className="flex flex-col gap-3"
        >
            <FormError message={state.error} />
            <button type="submit" disabled={pending} className={dangerButtonClass}>
                {pending ? "Deleting…" : "Delete user"}
            </button>
        </form>
    );
}
