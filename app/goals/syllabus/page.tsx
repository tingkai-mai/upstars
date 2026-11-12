import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { pluralize } from "@/lib/format";
import { Accordion, EmptyState, formatWeeks } from "@/app/syllabus/ui";
import type { Chapter, Week } from "@/app/syllabus/queries";
import { loadProgress, type ProgressData } from "../context";
import { GoalsHeader, percent, ProgressBar } from "../goals-header";
import { CompletionRow, WeekCompletionButton } from "../completion-checkbox";
import { ConceptCoverage } from "../concept-coverage";
import { listConceptLessons, type ConceptLesson } from "@/app/check-in/queries";
import { listStudentConcepts } from "@/app/syllabus/queries";
import { EditListIcon } from "@/components/icons";
import { secondaryButtonClass } from "@/components/form";
import { ActionButton } from "./action-button";
import { customiseSyllabus } from "./actions";
import { PlanEditor } from "./plan-editor";

export const metadata: Metadata = { title: "Syllabus progress" };

type Props = PageProps<"/goals/syllabus">;

export default function SyllabusProgressPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading progress…</p>}>
                <SyllabusProgress searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function SyllabusProgress({ searchParams }: Pick<Props, "searchParams">) {
    const params = await searchParams;
    const progress = await loadProgress(params);
    const { viewer, student, data } = progress;
    if (!student || !data) return <GoalsHeader tab="syllabus" progress={progress} />;

    const subjectId = data.plan.subject.id;
    const query = new URLSearchParams({ student: student.id, subject: subjectId });
    const viewHref = `/goals/syllabus?${query}`;
    // Only a custom syllabus is edited here; the standard one is edited by admins in Syllabus
    if (data.canEdit && data.plan.custom && params.edit === "1") {
        const studentConcepts = await listStudentConcepts(student.id, subjectId);
        return (
            <>
                <GoalsHeader tab="syllabus" progress={progress} />
                <PlanEditor student={student} plan={data.plan} studentConcepts={studentConcepts} viewHref={viewHref} />
            </>
        );
    }

    const conceptLessons = await listConceptLessons(student.id, subjectId);
    // Open the chapter the student is up to: the first with a concept not yet done
    const currentChapterId = data.plan.chapters.find((c) => c.weeks.some((w) => w.concepts.some((concept) => !data.completion.concepts.has(concept.id))))?.id;

    return (
        <>
            <GoalsHeader tab="syllabus" progress={progress} />
            <SyllabusSource
                student={student}
                isStudent={viewer.role === "student"}
                custom={data.plan.custom}
                canEdit={data.canEdit}
                editHref={`${viewHref}&edit=1`}
                customise={customiseSyllabus.bind(null, student.id, subjectId)}
            />
            <section aria-label="Chapters" className="flex flex-col gap-3">
                <p className="text-base text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">Taught</span> means a tutor covered it in a checked-in lesson.{" "}
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">Done</span> means it&apos;s finished.
                </p>
                {data.plan.chapters.length === 0 && <EmptyState>{data.plan.custom ? "This syllabus has no weeks yet." : "This subject has no chapters yet."}</EmptyState>}
                {data.plan.chapters.map((chapter) => (
                    <ChapterProgress key={chapter.id} chapter={chapter} studentId={student.id} data={data} conceptLessons={conceptLessons} defaultOpen={chapter.id === currentChapterId} />
                ))}
            </section>
        </>
    );
}

type SourceProps = {
    student: { name: string };
    isStudent: boolean;
    custom: boolean;
    canEdit: boolean;
    editHref: string;
    customise: () => Promise<{ error?: string }>;
};

/** Which syllabus the student follows, and for their tutors, the button to customise or edit it. */
function SyllabusSource({ student, isStudent, custom, canEdit, editHref, customise }: SourceProps) {
    if (isStudent) return custom ? <p className="text-base text-zinc-700 dark:text-zinc-300">Your tutor made this syllabus just for you.</p> : null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-violet-50 p-3 sm:p-4 dark:bg-violet-950/50">
            <p className="flex-1 text-base text-violet-950 dark:text-violet-100">
                {custom ? `${student.name} has a custom syllabus, changed from the standard one.` : `${student.name} follows the standard syllabus.`}
                {canEdit && !custom && " Customise it to reorder, add or remove weeks and concepts for them."}
            </p>
            {canEdit &&
                (custom ? (
                    <Link href={editHref} replace scroll={false} className={`${secondaryButtonClass} gap-2 bg-white dark:bg-zinc-950`}>
                        <EditListIcon />
                        Edit syllabus
                    </Link>
                ) : (
                    <ActionButton action={customise} successHref={editHref} pendingLabel="Customising…" className={`${secondaryButtonClass} gap-2 bg-white dark:bg-zinc-950`}>
                        <EditListIcon />
                        Customise for {student.name}
                    </ActionButton>
                ))}
        </div>
    );
}

type Lessons = Map<string, ConceptLesson[]>;
type ChapterProps = { chapter: Chapter; studentId: string; data: ProgressData; conceptLessons: Lessons; defaultOpen: boolean };

function ChapterProgress({ chapter, studentId, data, conceptLessons, defaultOpen }: ChapterProps) {
    const concepts = chapter.weeks.flatMap((w) => w.concepts);
    const done = concepts.filter((c) => data.completion.concepts.has(c.id)).length;
    const value = percent(done, concepts.length);

    return (
        <Accordion
            defaultOpen={defaultOpen}
            title={
                <span className="flex items-center justify-between gap-3">
                    {chapter.name}
                    <span className={`shrink-0 text-base tabular-nums ${value === 100 ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400"}`}>{value}%</span>
                </span>
            }
            subtitle={
                <span className="mt-1 flex flex-col gap-1.5">
                    <ProgressBar value={value} label={`${chapter.name} progress`} />
                    <span>
                        {formatWeeks(chapter.weeks.map((w) => w.number))} · {done} of {pluralize(concepts.length, "concept")} done
                    </span>
                </span>
            }
        >
            {chapter.weeks.length === 0 ? (
                <EmptyState>This chapter has no weeks yet.</EmptyState>
            ) : (
                chapter.weeks.map((week) => <WeekProgress key={week.id} week={week} studentId={studentId} data={data} conceptLessons={conceptLessons} />)
            )}
        </Accordion>
    );
}

/** A week's heading, then one row per concept: tick and name, with when it was taught underneath. */
function WeekProgress({ week, studentId, data, conceptLessons }: { week: Week; studentId: string; data: ProgressData; conceptLessons: Lessons }) {
    const done = week.concepts.filter((c) => data.completion.concepts.has(c.id)).length;

    return (
        <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Week {week.number}{" "}
                    <span className="font-normal text-zinc-600 dark:text-zinc-400">
                        · {done} of {week.concepts.length} done
                    </span>
                </h4>
                {data.canEdit && week.concepts.length > 1 && <WeekCompletionButton studentId={studentId} conceptIds={week.concepts.map((c) => c.id)} doneCount={done} weekNumber={week.number} />}
            </div>
            {week.concepts.length === 0 ? (
                <p className="px-3 py-3 text-base text-zinc-600 dark:text-zinc-400">No concepts yet</p>
            ) : (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {week.concepts.map((concept) => {
                        const isDone = data.completion.concepts.has(concept.id);
                        return (
                            <li key={concept.id} className="flex flex-col gap-1 px-3 py-2.5">
                                <CompletionRow kind="concept" studentId={studentId} itemId={concept.id} done={isDone} label={concept.name} editable={data.canEdit}>
                                    <span className="block pt-0.5 text-base text-zinc-900 dark:text-zinc-100">{concept.name}</span>
                                </CompletionRow>
                                {/* Outside the row's label, since it's a button of its own */}
                                <div className={data.canEdit ? "pl-10" : ""}>
                                    <ConceptCoverage conceptName={concept.name} lessons={conceptLessons.get(concept.id) ?? []} completedAt={data.completion.concepts.get(concept.id)} />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
