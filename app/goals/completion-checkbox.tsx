"use client";
import { useOptimistic, useTransition } from "react";
import { setCompletion, setConceptsCompletion, type CompletionKind } from "./actions";

const checkboxClass = "size-6 shrink-0 cursor-pointer accent-emerald-600 disabled:cursor-default disabled:opacity-100";

type Props = { kind: CompletionKind; studentId: string; itemId: string; done: boolean; label: string; editable: boolean };

/** Ticks an item done for a student, updating immediately and rolling back if the save fails. */
export function CompletionCheckbox({ kind, studentId, itemId, done, label, editable }: Props) {
    const [optimisticDone, setOptimisticDone] = useOptimistic(done);
    const [, startTransition] = useTransition();

    function toggle(next: boolean) {
        startTransition(async () => {
            setOptimisticDone(next);
            const result = await setCompletion(kind, studentId, itemId, next);
            if (result.error) alert(result.error);
        });
    }

    return (
        <input
            type="checkbox"
            checked={optimisticDone}
            disabled={!editable}
            onChange={(event) => toggle(event.target.checked)}
            aria-label={`${label}: ${optimisticDone ? "done" : "not done"}`}
            className={checkboxClass}
        />
    );
}

type WeekProps = { studentId: string; conceptIds: string[]; doneCount: number; weekNumber: number; editable: boolean };

/** Ticks every concept in a week at once; shows a dash when only some are done. */
export function WeekCompletionCheckbox({ studentId, conceptIds, doneCount, weekNumber, editable }: WeekProps) {
    const [optimisticCount, setOptimisticCount] = useOptimistic(doneCount);
    const [, startTransition] = useTransition();
    const allDone = conceptIds.length > 0 && optimisticCount === conceptIds.length;

    function toggle(next: boolean) {
        startTransition(async () => {
            setOptimisticCount(next ? conceptIds.length : 0);
            const result = await setConceptsCompletion(studentId, conceptIds, next);
            if (result.error) alert(result.error);
        });
    }

    return (
        <input
            type="checkbox"
            checked={allDone}
            ref={(el) => {
                if (el) el.indeterminate = optimisticCount > 0 && !allDone;
            }}
            disabled={!editable || conceptIds.length === 0}
            onChange={(event) => toggle(event.target.checked)}
            aria-label={`Week ${weekNumber}: mark all concepts ${allDone ? "not done" : "done"}`}
            className={checkboxClass}
        />
    );
}
