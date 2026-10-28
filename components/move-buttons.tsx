"use client";
import { useTransition } from "react";

const buttonClass =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

type Props = {
    /** A Server Action bound to the item, e.g. moveConcept.bind(null, id) */
    action: (direction: "up" | "down") => Promise<{ error?: string }>;
    name: string;
    isFirst: boolean;
    isLast: boolean;
};

/** Up and down arrows for reordering an item in a list. */
export function MoveButtons({ action, name, isFirst, isLast }: Props) {
    const [pending, startTransition] = useTransition();

    function move(direction: "up" | "down") {
        if (pending) return;
        startTransition(async () => {
            const result = await action(direction);
            if (result.error) alert(result.error);
        });
    }

    // Not disabled while saving: a disabled button drops keyboard focus, which breaks repeated moves
    return (
        <div className="-my-1.5 flex shrink-0" aria-busy={pending}>
            <button type="button" onClick={() => move("up")} disabled={isFirst} aria-label={`Move ${name} up`} className={buttonClass}>
                <Arrow direction="up" />
            </button>
            <button type="button" onClick={() => move("down")} disabled={isLast} aria-label={`Move ${name} down`} className={buttonClass}>
                <Arrow direction="down" />
            </button>
        </div>
    );
}

function Arrow({ direction }: { direction: "up" | "down" }) {
    return (
        <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={`size-5 ${direction === "down" ? "rotate-180" : ""}`}>
            <path d="M10 15V5M5 10l5-5 5 5" />
        </svg>
    );
}
