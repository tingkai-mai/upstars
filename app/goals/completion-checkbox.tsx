"use client";
import { useOptimistic, useTransition, type ReactNode } from "react";
import { CheckIcon } from "@/components/icons";
import { setCompletion, setConceptsCompletion, type CompletionKind } from "./actions";

type Props = { kind: CompletionKind; studentId: string; itemId: string; done: boolean; label: string; editable: boolean; children: ReactNode };

/**
 * An item and whether the student has done it. Editors tap anywhere on the row to tick it, which updates
 * immediately and rolls back if the save fails; everyone else sees Done or Not yet.
 */
export function CompletionRow({ kind, studentId, itemId, done, label, editable, children }: Props) {
    const [optimisticDone, setOptimisticDone] = useOptimistic(done);
    const [, startTransition] = useTransition();

    function toggle(next: boolean) {
        startTransition(async () => {
            setOptimisticDone(next);
            const result = await setCompletion(kind, studentId, itemId, next);
            if (result.error) alert(result.error);
        });
    }

    if (!editable) {
        return (
            <div className="flex min-h-12 items-start gap-3">
                <div className="min-w-0 flex-1">{children}</div>
                <DoneStatus done={done} />
            </div>
        );
    }

    return (
        <label className="flex min-h-12 cursor-pointer items-start gap-3">
            <input
                type="checkbox"
                checked={optimisticDone}
                onChange={(event) => toggle(event.target.checked)}
                aria-label={`${label}: ${optimisticDone ? "done" : "not done"}`}
                className="mt-0.5 size-7 shrink-0 cursor-pointer accent-emerald-600"
            />
            <div className="min-w-0 flex-1">{children}</div>
        </label>
    );
}

export function DoneStatus({ done }: { done: boolean }) {
    return done ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckIcon />
            Done
        </span>
    ) : (
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Not yet</span>
    );
}

type WeekProps = { studentId: string; conceptIds: string[]; doneCount: number; weekNumber: number };

/** Marks every concept in a week done at once, or undoes them all. */
export function WeekCompletionButton({ studentId, conceptIds, doneCount, weekNumber }: WeekProps) {
    const [optimisticCount, setOptimisticCount] = useOptimistic(doneCount);
    const [pending, startTransition] = useTransition();
    const allDone = optimisticCount === conceptIds.length;

    function toggle() {
        startTransition(async () => {
            setOptimisticCount(allDone ? 0 : conceptIds.length);
            const result = await setConceptsCompletion(studentId, conceptIds, !allDone);
            if (result.error) alert(result.error);
        });
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-busy={pending}
            aria-label={`Week ${weekNumber}: ${allDone ? "mark all concepts not done" : "mark all concepts done"}`}
            className="inline-flex h-11 shrink-0 items-center rounded-lg border border-zinc-300 bg-white px-3 text-base font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
            {allDone ? "Undo week" : "Mark week done"}
        </button>
    );
}
