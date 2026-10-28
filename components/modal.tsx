// Used only inside client components, so it needs no "use client" entry of its own
import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from "react";

type Props = {
    title: string;
    /** Called when the modal is dismissed (Esc, backdrop, close button). Unmount the modal in response. */
    onClose: () => void;
    closeLabel?: string;
    /** Prevents closing by backdrop click, e.g. while saving */
    busy?: boolean;
    /** "full" fills a phone's screen, for long forms */
    size?: "auto" | "full";
    /** Asked before closing; return false to stay open, e.g. to keep unsaved work */
    confirmClose?: () => boolean;
    children: ReactNode;
};

const SIZES = {
    auto: "max-h-[90dvh] rounded-t-2xl",
    full: "h-dvh max-h-none sm:h-auto sm:max-h-[90dvh]",
};

/** A native modal <dialog>: a bottom sheet on phones, centred on larger screens. Mount it to open it. */
export function Modal({ title, onClose, closeLabel = "Cancel", busy = false, size = "auto", confirmClose, children }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    function requestClose() {
        if (!confirmClose || confirmClose()) dialogRef.current?.close();
    }

    // Esc fires "cancel" before closing; stop it if the user wants to keep their work
    function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
        if (confirmClose && !confirmClose()) event.preventDefault();
    }

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onCancel={handleCancel}
            // Clicking the backdrop (the dialog element itself, outside the panel) closes it
            onClick={(event) => event.target === event.currentTarget && !busy && requestClose()}
            aria-labelledby={titleId}
            className={`m-0 mt-auto w-full max-w-none bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/80 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-2xl dark:bg-zinc-950 dark:text-zinc-50 ${SIZES[size]}`}
        >
            <div className="flex flex-col gap-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
                {/* Sticky, so the close button stays in reach while scrolling a long modal */}
                <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-center justify-between gap-4 bg-white px-5 pt-5 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 dark:bg-zinc-950">
                    <h2 id={titleId} className="text-xl font-semibold">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={requestClose}
                        className="inline-flex h-11 shrink-0 items-center rounded-lg bg-zinc-100 px-4 text-base font-medium text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                        {closeLabel}
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    );
}
