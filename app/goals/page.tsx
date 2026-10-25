import { Suspense } from "react";
import type { Metadata } from "next";
import { FormDialog } from "@/components/form-dialog";
import { inlineEditButtonClass } from "@/components/form";
import { EmptyState } from "@/app/syllabus/ui";
import { loadProgress } from "./context";
import { GoalsHeader, percent } from "./goals-header";
import { listGoals, type Goal } from "./queries";
import { createGoal, deleteGoal, updateGoal } from "./actions";
import { GoalFields, MONTHS } from "./goal-fields";

export const metadata: Metadata = { title: "Goal tracking" };

type Props = PageProps<"/goals">;

export default function GoalsPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-500">Loading goals…</p>}>
                <GoalsTab searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function GoalsTab({ searchParams }: Pick<Props, "searchParams">) {
    const progress = await loadProgress(await searchParams);
    const { student, selection, data } = progress;
    const goals = student && selection.subject && data ? await listGoals(student.id, selection.subject.id) : [];
    const today = new Date();
    const now = { year: today.getFullYear(), month: today.getMonth() + 1 };

    return (
        <>
            <GoalsHeader tab="goals" progress={progress} />
            {student && selection.subject && data && (
                <section aria-labelledby="goals-heading" className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="goals-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Quarterly goals
                        </h2>
                        {data.canEdit && (
                            <FormDialog
                                title="Add goal"
                                trigger="Add goal"
                                triggerLabel="Add goal"
                                triggerClassName="inline-flex h-10 shrink-0 items-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                submitLabel="Add goal"
                                action={createGoal.bind(null, student.id, selection.subject.id)}
                            >
                                <GoalFields now={now} />
                            </FormDialog>
                        )}
                    </div>

                    {goals.length === 0 ? (
                        <EmptyState>No goals yet{data.canEdit ? ". Add one for this quarter." : "."}</EmptyState>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                                    <tr>
                                        <th scope="col" className="px-3 py-2 font-medium">
                                            Quarter
                                        </th>
                                        <th scope="col" className="px-3 py-2 font-medium">
                                            Target
                                        </th>
                                        <th scope="col" className="px-3 py-2 font-medium">
                                            Actual
                                        </th>
                                        {data.canEdit && (
                                            <th scope="col" className="w-0 px-1 py-2">
                                                <span className="sr-only">Edit</span>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {goals.map((g) => (
                                        <GoalRow key={g.id} goal={g} canEdit={data.canEdit} now={now} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </>
    );
}

function Marks({ marks, total }: { marks: number; total: number }) {
    return (
        <>
            <span className="block font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {marks}/{total}
            </span>
            <span className="block text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{percent(marks, total)}%</span>
        </>
    );
}

function GoalStatus({ goal }: { goal: Goal }) {
    if (goal.actualMarks === null) return <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Pending</span>;
    const gap = goal.targetMarks - goal.actualMarks;
    return gap <= 0 ? (
        <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Met</span>
    ) : (
        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">{gap} short</span>
    );
}

function GoalRow({ goal, canEdit, now }: { goal: Goal; canEdit: boolean; now: { year: number; month: number } }) {
    const label = `Q${goal.quarter} ${goal.year}`;
    return (
        <tr className="border-t border-zinc-200 align-top dark:border-zinc-800">
            <th scope="row" className="px-3 py-3 font-normal">
                <span className="block font-semibold text-zinc-900 dark:text-zinc-50">{label}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {MONTHS[goal.month - 1]} {goal.year}
                </span>
            </th>
            <td className="px-3 py-3">
                <Marks marks={goal.targetMarks} total={goal.totalMarks} />
            </td>
            <td className="px-3 py-3">
                {goal.actualMarks === null ? <span className="block text-zinc-400">—</span> : <Marks marks={goal.actualMarks} total={goal.totalMarks} />}
                <GoalStatus goal={goal} />
            </td>
            {canEdit && (
                <td className="px-1 py-2">
                    <FormDialog
                        title={`Edit ${label} goal`}
                        trigger="Edit"
                        triggerLabel={`Edit ${label} goal`}
                        triggerClassName={inlineEditButtonClass}
                        submitLabel="Save goal"
                        action={updateGoal.bind(null, goal.id)}
                        remove={{ action: deleteGoal.bind(null, goal.id), label: "Delete goal", confirm: `Delete the ${label} goal?` }}
                    >
                        <GoalFields defaults={goal} now={now} />
                    </FormDialog>
                </td>
            )}
        </tr>
    );
}
