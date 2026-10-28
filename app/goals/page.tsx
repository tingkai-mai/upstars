import { Suspense } from "react";
import type { Metadata } from "next";
import { FormDialog } from "@/components/form-dialog";
import { compactPrimaryButtonClass, secondaryButtonClass } from "@/components/form";
import { PenIcon } from "@/components/icons";
import { EmptyState } from "@/app/syllabus/ui";
import { loadProgress } from "./context";
import { GoalsHeader } from "./goals-header";
import { listGoals, type Goal } from "./queries";
import { createGoal, deleteGoal, updateGoal } from "./actions";
import { GoalFields, MONTHS } from "./goal-fields";
import { GoalStatus, Marks } from "./goal-result";

export const metadata: Metadata = { title: "Goal tracking" };

type Props = PageProps<"/goals">;

export default function GoalsPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading goals…</p>}>
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
                                triggerClassName={compactPrimaryButtonClass}
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
                        <ul className="flex flex-col gap-3">
                            {goals.map((g) => (
                                <GoalCard key={g.id} goal={g} canEdit={data.canEdit} now={now} />
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </>
    );
}

function GoalCard({ goal, canEdit, now }: { goal: Goal; canEdit: boolean; now: { year: number; month: number } }) {
    const label = `Q${goal.quarter} ${goal.year}`;
    return (
        <li className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{label}</h3>
                    <p className="text-base text-zinc-600 dark:text-zinc-400">
                        Exam in {MONTHS[goal.month - 1]} {goal.year}
                    </p>
                </div>
                <GoalStatus goal={goal} />
            </div>
            <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                    <dt className="text-base text-zinc-600 dark:text-zinc-400">Target</dt>
                    <dd>
                        <Marks marks={goal.targetMarks} total={goal.totalMarks} />
                    </dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                    <dt className="text-base text-zinc-600 dark:text-zinc-400">Result</dt>
                    <dd>{goal.actualMarks === null ? <span className="block text-lg text-zinc-600 dark:text-zinc-400">Not yet</span> : <Marks marks={goal.actualMarks} total={goal.totalMarks} />}</dd>
                </div>
            </dl>
            {canEdit && (
                <FormDialog
                    title={`Edit ${label} goal`}
                    trigger={
                        <>
                            <PenIcon />
                            Edit {label} goal
                        </>
                    }
                    triggerLabel={`Edit ${label} goal`}
                    triggerClassName={`${secondaryButtonClass} w-full gap-2`}
                    submitLabel="Save goal"
                    action={updateGoal.bind(null, goal.id)}
                    remove={{ action: deleteGoal.bind(null, goal.id), label: "Delete goal", confirm: `Delete the ${label} goal?` }}
                >
                    <GoalFields defaults={goal} now={now} />
                </FormDialog>
            )}
        </li>
    );
}
