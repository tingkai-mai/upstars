// Used only inside client components, so it needs no "use client" entry of its own
import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
    title: string;
    /** Called when the modal is dismissed (Esc, backdrop, close button). Unmount the modal in response. */
    onClose: () => void;
    closeLabel?: string;
    /** Prevents closing by backdrop click, e.g. while saving */
    busy?: boolean;
    children: ReactNode;
};

/** A native modal <dialog>: a bottom sheet on phones, centred on larger screens. Mount it to open it. */
export function Modal({ title, onClose, closeLabel = "Cancel", busy = false, children }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            // Clicking the backdrop (the dialog element itself, outside the panel) closes it
            onClick={(event) => event.target === event.currentTarget && !busy && dialogRef.current?.close()}
            aria-labelledby={titleId}
            className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/80 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-2xl dark:bg-zinc-950 dark:text-zinc-50"
        >
            <div className="flex flex-col gap-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                    <h2 id={titleId} className="text-xl font-semibold">
                        {title}
                    </h2>
                    <button type="button" onClick={() => dialogRef.current?.close()} className="inline-flex h-10 shrink-0 items-center rounded-lg bg-zinc-100 px-3 text-base font-medium text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                        {closeLabel}
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    );
}
