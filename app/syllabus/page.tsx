import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin, requireUser } from "@/lib/session";
import { formatMinutes, pluralize } from "@/lib/format";
import { FormDialog } from "@/components/form-dialog";
import { CheckIcon, EditListIcon } from "@/components/icons";
import { addButtonClass, inlineEditButtonClass, secondaryButtonClass } from "@/components/form";
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
            <Suspense fallback={<p className="text-zinc-500">Loading syllabus…</p>}>
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
                <EmptyState>No subjects yet.{canEdit && " Use Subjects above to add one."}</EmptyState>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            {plan.subject.level} {plan.subject.name}
                        </h2>
                        {canEdit && (
                            <Link href={`/syllabus?subject=${plan.subject.id}${editing ? "" : "&edit=1"}`} replace scroll={false} className={`${secondaryButtonClass} gap-2`}>
                                {editing ? <CheckIcon /> : <EditListIcon />}
                                {editing ? "Done" : "Edit syllabus"}
                            </Link>
                        )}
                    </div>

                    {editing && (
                        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            You&apos;re editing chapters, weeks and concepts. Changes save as you go.
                        </p>
                    )}

                    <Summary plan={plan} />

                    {plan.chapters.length === 0 && <EmptyState>No chapters yet.{editing ? " Add one below." : ""}</EmptyState>}
                    <section aria-label="Chapters" className="flex flex-col gap-3">
                        {plan.chapters.map((chapter) => (
                            <ChapterTable key={chapter.id} chapter={chapter} plan={plan} editing={editing} />
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
    const stats = [
        { label: "Chapters", value: String(plan.chapters.length) },
        { label: "Weeks", value: String(weeks.length) },
        { label: "Concepts", value: String(weeks.reduce((sum, w) => sum + w.concepts.length, 0)) },
        { label: "Teaching", value: formatMinutes(weeks.reduce((sum, w) => sum + w.durationMin, 0)) },
    ];
    return (
        <dl aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <dt className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{stat.value}</dd>
                </div>
            ))}
        </dl>
    );
}

function ChapterTable({ chapter, plan, editing }: { chapter: Chapter; plan: SubjectPlan; editing: boolean }) {
    const teaching = chapter.weeks.reduce((sum, w) => sum + w.durationMin, 0);
    const conceptCount = chapter.weeks.reduce((sum, w) => sum + w.concepts.length, 0);
    const nextWeekNumber = Math.max(0, ...plan.chapters.flatMap((c) => c.weeks.map((w) => w.number))) + 1;
    const chapterOptions = plan.chapters.map((c) => ({ id: c.id, name: c.name }));

    return (
        <Accordion
            title={chapter.name}
            subtitle={chapter.weeks.length ? `${formatWeeks(chapter.weeks.map((w) => w.number))} · ${pluralize(conceptCount, "concept")} · ${formatMinutes(teaching)}` : "No weeks yet"}
        >
            {editing && (
                // Inside the panel, not the header: a button in <summary> would also toggle the accordion
                <div className="flex justify-end">
                    <FormDialog
                        title="Edit chapter"
                        trigger="Edit chapter"
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
            {chapter.weeks.length > 0 && (
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
                            </tr>
                        </thead>
                        {chapter.weeks.map((week) => (
                            <WeekRows key={week.id} week={week} editing={editing} chapterOptions={chapterOptions} />
                        ))}
                    </table>
                </div>
            )}

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

/** One <tbody> per week: the week cell spans all of its concept rows. */
function WeekRows({ week, editing, chapterOptions }: { week: Week; editing: boolean; chapterOptions: { id: string; name: string }[] }) {
    const rowCount = Math.max(1, week.concepts.length) + (editing ? 1 : 0);

    const weekCell = (
        <th scope="rowgroup" rowSpan={rowCount} className="border-r border-zinc-200 px-3 py-2.5 align-top font-normal dark:border-zinc-800">
            <span className="block font-semibold text-zinc-900 dark:text-zinc-50">Week {week.number}</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{formatMinutes(week.durationMin)}</span>
            {editing && (
                <FormDialog
                    title={`Edit week ${week.number}`}
                    trigger="Edit"
                    triggerLabel={`Edit week ${week.number}`}
                    triggerClassName={`${inlineEditButtonClass} -ml-2.5 mt-1`}
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
        </th>
    );

    return (
        <tbody className="border-t border-zinc-200 dark:border-zinc-800">
            {week.concepts.length === 0 && (
                <tr>
                    {weekCell}
                    <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400">No concepts yet</td>
                </tr>
            )}
            {week.concepts.map((concept, index) => (
                <tr key={concept.id} className="border-t border-zinc-100 first:border-t-0 dark:border-zinc-800/60">
                    {index === 0 && weekCell}
                    <td className="px-3 py-2.5 align-top text-zinc-800 dark:text-zinc-200">
                        <div className="flex items-start gap-2">
                            <span className="min-w-0 flex-1">{concept.name}</span>
                            {editing && week.concepts.length > 1 && (
                                <MoveButtons action={actions.moveConcept.bind(null, concept.id)} name={concept.name} isFirst={index === 0} isLast={index === week.concepts.length - 1} />
                            )}
                            {editing && (
                                <FormDialog
                                    title="Edit concept"
                                    trigger="Edit"
                                    triggerLabel={`Edit concept ${concept.name}`}
                                    triggerClassName={`${inlineEditButtonClass} -my-1.5`}
                                    submitLabel="Save concept"
                                    action={actions.updateConcept.bind(null, concept.id)}
                                    remove={{ action: actions.deleteConcept.bind(null, concept.id), label: "Delete concept", confirm: `Delete “${concept.name}”? It will also be removed from any worksheets.` }}
                                >
                                    <ConceptFields defaultName={concept.name} />
                                </FormDialog>
                            )}
                        </div>
                    </td>
                </tr>
            ))}
            {editing && (
                <tr className="border-t border-zinc-100 dark:border-zinc-800/60">
                    <td className="px-3 py-2">
                        <FormDialog
                            title={`Add concept to week ${week.number}`}
                            trigger="+ Add concept"
                            triggerLabel={`Add concept to week ${week.number}`}
                            triggerClassName={addButtonClass.replace("h-11", "h-9")}
                            submitLabel="Add concept"
                            action={actions.createConcept.bind(null, week.id)}
                        >
                            <ConceptFields />
                        </FormDialog>
                    </td>
                </tr>
            )}
        </tbody>
    );
}
