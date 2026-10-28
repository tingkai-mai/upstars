import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin, requireUser } from "@/lib/session";
import { formatMinutes, pluralize } from "@/lib/format";
import { FormDialog } from "@/components/form-dialog";
import { CheckIcon, EditListIcon, PenIcon } from "@/components/icons";
import { addButtonClass, compactPrimaryButtonClass, inlineEditButtonClass, secondaryButtonClass } from "@/components/form";
import { getSubjectPlan, type Chapter, type SubjectPlan, type Week } from "./queries";
import * as actions from "./actions";
import { ChapterFields, ConceptFields, WeekFields } from "./fields";
import { MoveButtons } from "@/components/move-buttons";
import { resolveSelection } from "./selection";
import { SyllabusHeader } from "./syllabus-header";
import { Accordion, EmptyState, formatWeeks } from "./ui";

export const metadata: Metadata = { title: "Syllabus" };

type Props = PageProps<"/syllabus">;

export default function SyllabusPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading syllabus…</p>}>
                <SyllabusTab searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function SyllabusTab({ searchParams }: Pick<Props, "searchParams">) {
    const [user, params] = await Promise.all([requireUser(), searchParams]);
    const selection = await resolveSelection(params);
    const plan = selection.subject ? await getSubjectPlan(selection.subject.id) : null;
    const canEdit = isAdmin(user);
    const editing = canEdit && params.edit === "1";

    return (
        <>
            <SyllabusHeader tab="syllabus" selection={selection} canEdit={canEdit} />

            {!plan ? (
                <EmptyState>No subjects yet.{canEdit && " Use Edit levels & subjects above to add one."}</EmptyState>
            ) : (
                <>
                    {editing ? (
                        // Sticky, so Done stays in reach while editing further down
                        <div className="sticky top-14 z-10 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 shadow-sm sm:p-4 dark:bg-amber-950">
                            <p className="flex-1 text-base text-amber-900 dark:text-amber-200">Editing. Changes save as you go. Open a chapter to change its weeks and concepts.</p>
                            <Link href={`/syllabus?subject=${plan.subject.id}`} replace scroll={false} className={`${compactPrimaryButtonClass} gap-2`}>
                                <CheckIcon />
                                Done
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Summary plan={plan} />
                            {canEdit && (
                                <Link href={`/syllabus?subject=${plan.subject.id}&edit=1`} replace scroll={false} className={`${secondaryButtonClass} gap-2`}>
                                    <EditListIcon />
                                    Edit syllabus
                                </Link>
                            )}
                        </div>
                    )}

                    {plan.chapters.length === 0 && <EmptyState>No chapters yet.{editing ? " Add one below." : ""}</EmptyState>}
                    <section aria-label="Chapters" className="flex flex-col gap-3">
                        {plan.chapters.map((chapter, index) => (
                            <ChapterTable key={chapter.id} chapter={chapter} plan={plan} editing={editing} defaultOpen={editing && index === 0} />
                        ))}
                    </section>
                    {editing && (
                        <FormDialog title="Add chapter" trigger="+ Add chapter" triggerLabel="Add chapter" triggerClassName={addButtonClass} submitLabel="Add chapter" action={actions.createChapter.bind(null, plan.subject.id)}>
                            <ChapterFields />
                        </FormDialog>
                    )}
                </>
            )}
        </>
    );
}

function Summary({ plan }: { plan: SubjectPlan }) {
    const weeks = plan.chapters.flatMap((c) => c.weeks);
    const counts = [
        { noun: "chapter", count: plan.chapters.length },
        { noun: "week", count: weeks.length },
        { noun: "concept", count: weeks.reduce((sum, w) => sum + w.concepts.length, 0) },
    ];
    const stats = [
        ...counts.map(({ noun, count }) => ({ label: count === 1 ? noun : `${noun}s`, value: String(count) })),
        { label: "teaching", value: formatMinutes(weeks.reduce((sum, w) => sum + w.durationMin, 0)) },
    ];
    return (
        <dl aria-label="Summary" className="flex flex-wrap gap-x-5 gap-y-1">
            {stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-1.5">
                    <dt className="text-base text-zinc-600 dark:text-zinc-400">{stat.label}</dt>
                    <dd className="order-first text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{stat.value}</dd>
                </div>
            ))}
        </dl>
    );
}

function ChapterTable({ chapter, plan, editing, defaultOpen }: { chapter: Chapter; plan: SubjectPlan; editing: boolean; defaultOpen: boolean }) {
    const teaching = chapter.weeks.reduce((sum, w) => sum + w.durationMin, 0);
    const conceptCount = chapter.weeks.reduce((sum, w) => sum + w.concepts.length, 0);
    const nextWeekNumber = Math.max(0, ...plan.chapters.flatMap((c) => c.weeks.map((w) => w.number))) + 1;
    const chapterOptions = plan.chapters.map((c) => ({ id: c.id, name: c.name }));

    return (
        <Accordion
            defaultOpen={defaultOpen}
            title={chapter.name}
            subtitle={chapter.weeks.length ? `${formatWeeks(chapter.weeks.map((w) => w.number))} · ${pluralize(conceptCount, "concept")} · ${formatMinutes(teaching)}` : "No weeks yet"}
        >
            {editing && (
                // Inside the panel, not the header: a button in <summary> would also toggle the accordion
                <div className="flex justify-end">
                    <FormDialog
                        title="Edit chapter"
                        trigger={
                            <>
                                <PenIcon />
                                Edit chapter
                            </>
                        }
                        triggerLabel={`Edit chapter ${chapter.name}`}
                        triggerClassName={inlineEditButtonClass}
                        submitLabel="Save chapter"
                        action={actions.updateChapter.bind(null, chapter.id)}
                        remove={{
                            action: actions.deleteChapter.bind(null, chapter.id),
                            label: "Delete chapter",
                            confirm: `Delete ${chapter.name}? Its ${pluralize(chapter.weeks.length, "week")} and their concepts will be deleted too, and it will be removed from any tests.`,
                        }}
                    >
                        <ChapterFields defaultName={chapter.name} />
                    </FormDialog>
                </div>
            )}

            {chapter.weeks.length === 0 && <EmptyState>This chapter has no weeks yet.</EmptyState>}
            {chapter.weeks.map((week) => (
                <WeekBlock key={week.id} week={week} editing={editing} chapterOptions={chapterOptions} />
            ))}

            {editing && (
                <FormDialog
                    title={`Add week to ${chapter.name}`}
                    trigger="+ Add week"
                    triggerLabel={`Add week to ${chapter.name}`}
                    triggerClassName={addButtonClass}
                    submitLabel="Add week"
                    action={actions.createWeek.bind(null, plan.subject.id, chapter.id)}
                >
                    <WeekFields defaults={{ number: nextWeekNumber }} />
                </FormDialog>
            )}
        </Accordion>
    );
}

/** A week's heading, then its concepts in order. Editing adds controls on a line of their own under each name. */
function WeekBlock({ week, editing, chapterOptions }: { week: Week; editing: boolean; chapterOptions: { id: string; name: string }[] }) {
    return (
        <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Week {week.number} <span className="font-normal text-zinc-600 dark:text-zinc-400">· {formatMinutes(week.durationMin)}</span>
                </h4>
                {editing && (
                    <FormDialog
                        title={`Edit week ${week.number}`}
                        trigger={
                            <>
                                <PenIcon />
                                Edit week
                            </>
                        }
                        triggerLabel={`Edit week ${week.number}`}
                        triggerClassName={inlineEditButtonClass}
                        submitLabel="Save week"
                        action={actions.updateWeek.bind(null, week.id)}
                        remove={{
                            action: actions.deleteWeek.bind(null, week.id),
                            label: "Delete week",
                            confirm: `Delete week ${week.number}? Its ${pluralize(week.concepts.length, "concept")} will be deleted too, and removed from any worksheets.`,
                        }}
                    >
                        <WeekFields defaults={week} chapters={chapterOptions} />
                    </FormDialog>
                )}
            </div>

            {week.concepts.length === 0 && <p className="px-3 py-3 text-base text-zinc-600 dark:text-zinc-400">No concepts yet</p>}
            <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {week.concepts.map((concept, index) => (
                    <li key={concept.id} className="flex flex-col gap-2 px-3 py-2.5">
                        <span className="text-base text-zinc-900 dark:text-zinc-100">{concept.name}</span>
                        {editing && (
                            <div className="flex items-center justify-end gap-1">
                                {week.concepts.length > 1 && (
                                    <MoveButtons action={actions.moveConcept.bind(null, concept.id)} name={concept.name} isFirst={index === 0} isLast={index === week.concepts.length - 1} />
                                )}
                                <FormDialog
                                    title="Edit concept"
                                    trigger={
                                        <>
                                            <PenIcon />
                                            Edit
                                        </>
                                    }
                                    triggerLabel={`Edit concept ${concept.name}`}
                                    triggerClassName={inlineEditButtonClass}
                                    submitLabel="Save concept"
                                    action={actions.updateConcept.bind(null, concept.id)}
                                    remove={{ action: actions.deleteConcept.bind(null, concept.id), label: "Delete concept", confirm: `Delete “${concept.name}”? It will also be removed from any worksheets.` }}
                                >
                                    <ConceptFields defaultName={concept.name} />
                                </FormDialog>
                            </div>
                        )}
                    </li>
                ))}
            </ol>

            {editing && (
                <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
                    <FormDialog
                        title={`Add concept to week ${week.number}`}
                        trigger="+ Add concept"
                        triggerLabel={`Add concept to week ${week.number}`}
                        triggerClassName={addButtonClass}
                        submitLabel="Add concept"
                        action={actions.createConcept.bind(null, week.id)}
                    >
                        <ConceptFields />
                    </FormDialog>
                </div>
            )}
        </section>
    );
}
