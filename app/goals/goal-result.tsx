import { percent } from "./goals-header";
import type { Goal } from "./queries";

export function Marks({ marks, total }: { marks: number; total: number }) {
    return (
        <>
            <span className="block font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {marks}/{total}
            </span>
            <span className="block text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{percent(marks, total)}%</span>
        </>
    );
}

export function GoalStatus({ goal }: { goal: Pick<Goal, "targetMarks" | "actualMarks"> }) {
    if (goal.actualMarks === null) return <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Pending</span>;
    const gap = goal.targetMarks - goal.actualMarks;
    return gap <= 0 ? (
        <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Met</span>
    ) : (
        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">{gap} short</span>
    );
}
