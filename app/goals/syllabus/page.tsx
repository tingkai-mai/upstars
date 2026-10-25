import { Suspense } from "react";
import type { Metadata } from "next";
import { pluralize } from "@/lib/format";
import { Accordion, EmptyState, formatWeeks } from "@/app/syllabus/ui";
import type { Chapter, Week } from "@/app/syllabus/queries";
import { loadProgress, type ProgressData } from "../context";
import { GoalsHeader, percent, ProgressBar } from "../goals-header";
import { CompletionCheckbox, WeekCompletionCheckbox } from "../completion-checkbox";

export const metadata: Metadata = { title: "Syllabus progress" };

type Props = PageProps<"/goals/syllabus">;

export default function SyllabusProgressPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-500">Loading progress…</p>}>
                <SyllabusProgress searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function SyllabusProgress({ searchParams }: Pick<Props, "searchParams">) {
    const progress = await loadProgress(await searchParams);
    const { student, data } = progress;

    return (
        <>
            <GoalsHeader tab="syllabus" progress={progress} />
            {student && data && (
                <section aria-label="Chapters" className="flex flex-col gap-3">
                    {data.plan.chapters.length === 0 && <EmptyState>This subject has no chapters yet.</EmptyState>}
                    {data.plan.chapters.map((chapter) => (
                        <ChapterProgress key={chapter.id} chapter={chapter} studentId={student.id} data={data} />
                    ))}
                </section>
            )}
        </>
    );
}

function ChapterProgress({ chapter, studentId, data }: { chapter: Chapter; studentId: string; data: ProgressData }) {
    const concepts = chapter.weeks.flatMap((w) => w.concepts);
    const done = concepts.filter((c) => data.completion.concepts.has(c.id)).length;
    const value = percent(done, concepts.length);

    return (
        <Accordion
            title={
                <span className="flex items-center justify-between gap-3">
                    {chapter.name}
                    <span className={`shrink-0 text-sm tabular-nums ${value === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>{value}%</span>
                </span>
            }
            subtitle={
                <span className="mt-1 flex flex-col gap-1.5">
                    <ProgressBar value={value} label={`${chapter.name} progress`} />
                    <span>
                        {formatWeeks(chapter.weeks.map((w) => w.number))} · {done}/{pluralize(concepts.length, "concept")} done
                    </span>
                </span>
            }
        >
            {chapter.weeks.length === 0 ? (
                <EmptyState>This chapter has no weeks yet.</EmptyState>
            ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                            <tr>
                                <th scope="col" className="w-24 px-3 py-2 font-medium sm:w-32">
                                    Week
                                </th>
                                <th scope="col" className="px-3 py-2 font-medium">
                                    Concept
                                </th>
                                <th scope="col" className="w-14 px-3 py-2 text-center font-medium">
                                    Done
                                </th>
                            </tr>
                        </thead>
                        {chapter.weeks.map((week) => (
                            <WeekProgress key={week.id} week={week} studentId={studentId} data={data} />
                        ))}
                    </table>
                </div>
            )}
        </Accordion>
    );
}

function WeekProgress({ week, studentId, data }: { week: Week; studentId: string; data: ProgressData }) {
    const done = week.concepts.filter((c) => data.completion.concepts.has(c.id)).length;
    const weekCell = (
        <th scope="rowgroup" rowSpan={Math.max(1, week.concepts.length)} className="border-r border-zinc-200 px-3 py-2.5 align-top font-normal dark:border-zinc-800">
            <span className="block whitespace-nowrap font-semibold text-zinc-900 dark:text-zinc-50">Week {week.number}</span>
            <span className="mt-1 flex items-center gap-2">
                {data.canEdit && week.concepts.length > 1 && (
                    <WeekCompletionCheckbox studentId={studentId} conceptIds={week.concepts.map((c) => c.id)} doneCount={done} weekNumber={week.number} editable />
                )}
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {done}/{week.concepts.length}
                </span>
            </span>
        </th>
    );

    return (
        <tbody className="border-t border-zinc-200 dark:border-zinc-800">
            {week.concepts.length === 0 && (
                <tr>
                    {weekCell}
                    <td colSpan={2} className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400">
                        No concepts yet
                    </td>
                </tr>
            )}
            {week.concepts.map((concept, index) => {
                const isDone = data.completion.concepts.has(concept.id);
                return (
                    <tr key={concept.id} className="border-t border-zinc-100 first:border-t-0 dark:border-zinc-800/60">
                        {index === 0 && weekCell}
                        <td className={`px-3 py-2.5 align-top ${isDone ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}`}>{concept.name}</td>
                        <td className="px-3 py-2.5 text-center align-top">
                            <CompletionCheckbox kind="concept" studentId={studentId} itemId={concept.id} done={isDone} label={concept.name} editable={data.canEdit} />
                        </td>
                    </tr>
                );
            })}
        </tbody>
    );
}
