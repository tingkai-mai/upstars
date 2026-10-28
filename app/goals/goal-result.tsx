import { percent } from "./goals-header";
import type { Goal } from "./queries";

export function Marks({ marks, total }: { marks: number; total: number }) {
    return (
        <>
            <span className="block text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {marks}/{total}
            </span>
            {/* Out of 100, the percentage just repeats the marks */}
            {total !== 100 && <span className="block text-sm tabular-nums text-zinc-600 dark:text-zinc-400">{percent(marks, total)}%</span>}
        </>
    );
}

export function GoalStatus({ goal }: { goal: Pick<Goal, "targetMarks" | "actualMarks"> }) {
    if (goal.actualMarks === null) return <span className="inline-block shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Waiting for result</span>;
    const gap = goal.targetMarks - goal.actualMarks;
    return gap <= 0 ? (
        <span className="inline-block shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Target met</span>
    ) : (
        <span className="inline-block shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">{gap} marks short</span>
    );
}
