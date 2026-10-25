"use client";
import { useEffect, useState, useTransition, type ReactNode, type SubmitEvent } from "react";
import { dangerButtonClass, FormError, primaryButtonClass } from "@/components/form";
import { Modal } from "@/components/modal";

type Result = { error?: string };

type Props = {
    title: string;
    /** Content of the button that opens the dialog */
    trigger: ReactNode;
    triggerLabel: string;
    triggerClassName?: string;
    submitLabel: string;
    action: (formData: FormData) => Promise<Result>;
    remove?: { action: () => Promise<Result>; confirm: string; label?: string };
    /** Form fields */
    children: ReactNode;
};

export function FormDialog({ title, trigger, triggerLabel, triggerClassName, submitLabel, action, remove, children }: Props) {
    const [open, setOpen] = useState(false);

    // Close if Next hides this page (it keeps visited pages alive)
    useEffect(() => () => setOpen(false), []);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-label={triggerLabel} className={triggerClassName}>
                {trigger}
            </button>
            {/* Mounted only while open, so each opening starts with fresh fields and no stale error */}
            {open && (
                <DialogBody title={title} submitLabel={submitLabel} action={action} remove={remove} onClose={() => setOpen(false)}>
                    {children}
                </DialogBody>
            )}
        </>
    );
}

type BodyProps = Pick<Props, "title" | "submitLabel" | "action" | "remove" | "children"> & { onClose: () => void };

function DialogBody({ title, submitLabel, action, remove, onClose, children }: BodyProps) {
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();

    function run(work: () => Promise<Result>) {
        setError(undefined);
        startTransition(async () => {
            const result = await work();
            // State updates after an await must be wrapped again to stay in the transition; otherwise they
            // commit before the refreshed data does and the UI briefly shows stale values
            startTransition(() => (result.error ? setError(result.error) : onClose()));
        });
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        run(() => action(formData));
    }

    function handleRemove() {
        if (remove && confirm(remove.confirm)) run(remove.action);
    }

    return (
        <Modal title={title} onClose={onClose} busy={pending}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {children}

                <FormError message={error} />

                <button type="submit" disabled={pending} className={primaryButtonClass}>
                    {pending ? "Saving…" : submitLabel}
                </button>
                {remove && (
                    <button type="button" onClick={handleRemove} disabled={pending} className={dangerButtonClass}>
                        {remove.label ?? "Delete"}
                    </button>
                )}
            </form>
        </Modal>
    );
}
