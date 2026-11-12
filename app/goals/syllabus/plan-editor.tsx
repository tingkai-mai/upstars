import Link from "next/link";
import { formatMinutes, pluralize } from "@/lib/format";
import { FormDialog } from "@/components/form-dialog";
import { MoveButtons } from "@/components/move-buttons";
import { CheckIcon, PenIcon } from "@/components/icons";
import { addButtonClass, compactPrimaryButtonClass, dangerButtonClass, Field, inlineEditButtonClass, selectClass, selectStyle } from "@/components/form";
import { ConceptFields, TeachingTimeField } from "@/app/syllabus/fields";
import { Accordion, EmptyState, formatWeeks } from "@/app/syllabus/ui";
import type { Chapter, Concept, StudentPlan, Week } from "@/app/syllabus/queries";
import { ActionButton } from "./action-button";
import * as actions from "./actions";

type Student = { id: string; name: string };
type WeekOption = { id: string; label: string };
/** Concepts that could be added back, grouped by where they sit in the standard syllabus */
type ConceptGroup = { label: string; concepts: Concept[] };

type Props = {
    student: Student;
    plan: StudentPlan;
    /** Concepts a tutor added for this student, including any taken out since */
    studentConcepts: Concept[];
    /** Where Done goes */
    viewHref: string;
};

/** Editing a student's custom syllabus: reorder, add and remove chapters, weeks and concepts. Changes save as they go. */
export function PlanEditor({ student, plan, studentConcepts, viewHref }: Props) {
    const subjectId = plan.subject.id;
    const weeks = plan.chapters.flatMap((c) => c.weeks.map((w) => ({ ...w, chapterName: c.name })));
    const weekOptions = weeks.map((w) => ({ id: w.id, label: `Week ${w.number} · ${w.chapterName}` }));
    const inPlan = new Set(weeks.flatMap((w) => w.concepts.map((c) => c.id)));
    const addBackGroups: ConceptGroup[] = [
        ...plan.standard.chapters.flatMap((c) => c.weeks.map((w) => ({ label: `${c.name} · standard week ${w.number}`, concepts: w.concepts.filter((concept) => !inPlan.has(concept.id)) }))),
        { label: `Added for ${student.name}`, concepts: studentConcepts.filter((c) => !inPlan.has(c.id)) },
    ].filter((group) => group.concepts.length > 0);
    const chaptersInPlan = new Set(plan.chapters.map((c) => c.id));
    const otherChapters = plan.standard.chapters.filter((c) => !chaptersInPlan.has(c.id));

    return (
        <>
            {/* Sticky, so Done stays in reach while editing further down */}
            <div className="sticky top-14 z-10 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 shadow-sm sm:p-4 dark:bg-amber-950">
                <p className="flex-1 text-base text-amber-900 dark:text-amber-200">Editing {student.name}&apos;s syllabus. Changes save as you go and only affect {student.name}.</p>
                <Link href={viewHref} replace scroll={false} className={`${compactPrimaryButtonClass} gap-2`}>
                    <CheckIcon />
                    Done
                </Link>
            </div>

            {plan.chapters.length === 0 && <EmptyState>This syllabus has no weeks yet. Add a week to a chapter below.</EmptyState>}
            <section aria-label="Chapters" className="flex flex-col gap-3">
                {plan.chapters.map((chapter, index) => (
                    <ChapterEditor
                        key={chapter.id}
                        chapter={chapter}
                        student={student}
                        subjectId={subjectId}
                        isFirst={index === 0}
                        isLast={index === plan.chapters.length - 1}
                        weekOptions={weekOptions}
                        addBackGroups={addBackGroups}
                    />
                ))}
            </section>

            {otherChapters.length > 0 && (
                <section aria-labelledby="other-chapters-heading" className="flex flex-col gap-3">
                    <div>
                        <h2 id="other-chapters-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Chapters not in this syllabus
                        </h2>
                        <p className="text-base text-zinc-600 dark:text-zinc-400">Add a week to bring a chapter in. It goes at the end.</p>
                    </div>
                    {otherChapters.map((chapter) => (
                        <AddWeekDialog key={chapter.id} student={student} subjectId={subjectId} chapter={chapter} label={`+ Add week to ${chapter.name}`} />
                    ))}
                </section>
            )}

            <section aria-labelledby="reset-heading" className="flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <div>
                    <h2 id="reset-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Go back to the standard syllabus
                    </h2>
                    <p className="text-base text-zinc-600 dark:text-zinc-400">Removes {student.name}&apos;s changes. Done ticks and past lessons are kept.</p>
                </div>
                <ActionButton
                    action={actions.resetSyllabus.bind(null, student.id, subjectId)}
                    pendingLabel="Resetting…"
                    className={dangerButtonClass}
                    confirm={`Put ${student.name} back on the standard syllabus? Your changes to their syllabus will be lost.`}
                >
                    Reset to standard syllabus
                </ActionButton>
            </section>
        </>
    );
}

type ChapterProps = {
    chapter: Chapter;
    student: Student;
    subjectId: string;
    isFirst: boolean;
    isLast: boolean;
    weekOptions: WeekOption[];
    addBackGroups: ConceptGroup[];
};

function ChapterEditor({ chapter, student, subjectId, isFirst, isLast, weekOptions, addBackGroups }: ChapterProps) {
    const conceptCount = chapter.weeks.reduce((sum, w) => sum + w.concepts.length, 0);
    const teaching = chapter.weeks.reduce((sum, w) => sum + w.durationMin, 0);

    return (
        <Accordion
            defaultOpen={isFirst}
            title={chapter.name}
            subtitle={`${formatWeeks(chapter.weeks.map((w) => w.number))} · ${pluralize(conceptCount, "concept")} · ${formatMinutes(teaching)}`}
        >
            {/* Inside the panel, not the header: a button in <summary> would also toggle the accordion */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                {!(isFirst && isLast) ? (
                    <span className="flex items-center gap-2 text-base text-zinc-600 dark:text-zinc-400">
                        Move chapter
                        <MoveButtons action={actions.moveChapter.bind(null, student.id, subjectId, chapter.id)} name={chapter.name} isFirst={isFirst} isLast={isLast} />
                    </span>
                ) : (
                    <span />
                )}
                <ActionButton
                    action={actions.removeChapter.bind(null, student.id, subjectId, chapter.id)}
                    pendingLabel="Removing…"
                    className={inlineEditButtonClass}
                    confirm={`Take ${chapter.name} out of ${student.name}'s syllabus? Its ${pluralize(chapter.weeks.length, "week")} will be removed. Done ticks and past lessons are kept.`}
                >
                    Remove chapter
                </ActionButton>
            </div>

            {chapter.weeks.map((week, index) => (
                <WeekEditor
                    key={week.id}
                    week={week}
                    student={student}
                    isFirst={index === 0}
                    isLast={index === chapter.weeks.length - 1}
                    weekOptions={weekOptions}
                    addBackGroups={addBackGroups}
                />
            ))}

            <AddWeekDialog student={student} subjectId={subjectId} chapter={chapter} label="+ Add week" />
        </Accordion>
    );
}

function AddWeekDialog({ student, subjectId, chapter, label }: { student: Student; subjectId: string; chapter: { id: string; name: string }; label: string }) {
    return (
        <FormDialog
            title={`Add week to ${chapter.name}`}
            trigger={label}
            triggerLabel={`Add week to ${chapter.name}`}
            triggerClassName={addButtonClass}
            submitLabel="Add week"
            action={actions.addWeek.bind(null, student.id, subjectId, chapter.id)}
        >
            <TeachingTimeField />
        </FormDialog>
    );
}

type WeekProps = { week: Week; student: Student; isFirst: boolean; isLast: boolean; weekOptions: WeekOption[]; addBackGroups: ConceptGroup[] };

/** A week's heading and controls, then its concepts in order, each with controls on a line of their own. */
function WeekEditor({ week, student, isFirst, isLast, weekOptions, addBackGroups }: WeekProps) {
    const weekName = `week ${week.number}`;

    return (
        <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Week {week.number} <span className="font-normal text-zinc-600 dark:text-zinc-400">· {formatMinutes(week.durationMin)}</span>
                </h4>
                <div className="flex items-center gap-1">
                    {!(isFirst && isLast) && <MoveButtons action={actions.moveWeek.bind(null, week.id)} name={weekName} isFirst={isFirst} isLast={isLast} />}
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
                            action: actions.removeWeek.bind(null, week.id),
                            label: "Remove week",
                            confirm: `Take week ${week.number} out of ${student.name}'s syllabus? Its ${pluralize(week.concepts.length, "concept")} will be removed with it. Done ticks and past lessons are kept.`,
                        }}
                    >
                        <TeachingTimeField defaultValue={week.durationMin} />
                    </FormDialog>
                </div>
            </div>

            {week.concepts.length === 0 && <p className="px-3 py-3 text-base text-zinc-600 dark:text-zinc-400">No concepts yet</p>}
            <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {week.concepts.map((concept, index) => (
                    <li key={concept.id} className="flex flex-col gap-2 px-3 py-2.5">
                        <span className="text-base text-zinc-900 dark:text-zinc-100">
                            {concept.name}
                            {concept.addedForStudent && <span className="ml-2 inline-block rounded-md bg-violet-100 px-2 text-sm font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">Added for {student.name}</span>}
                        </span>
                        <div className="flex items-center justify-end gap-1">
                            {week.concepts.length > 1 && (
                                <MoveButtons action={actions.moveConcept.bind(null, week.id, concept.id)} name={concept.name} isFirst={index === 0} isLast={index === week.concepts.length - 1} />
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
                                action={actions.updateConcept.bind(null, week.id, concept.id)}
                                remove={{
                                    action: actions.removeConcept.bind(null, week.id, concept.id),
                                    label: "Remove from syllabus",
                                    confirm: `Take “${concept.name}” out of ${student.name}'s syllabus? You can add it back later. Done ticks and past lessons are kept.`,
                                }}
                            >
                                {concept.addedForStudent ? (
                                    <ConceptFields defaultName={concept.name} />
                                ) : (
                                    <p className="text-base text-zinc-700 dark:text-zinc-300">
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{concept.name}</span> is from the standard syllabus, so only an admin can rename it.
                                    </p>
                                )}
                                <WeekSelect weekOptions={weekOptions} defaultValue={week.id} />
                            </FormDialog>
                        </div>
                    </li>
                ))}
            </ol>

            <div className="flex flex-col gap-2 border-t border-zinc-200 p-2 dark:border-zinc-800">
                <FormDialog
                    title={`Add a new concept to week ${week.number}`}
                    trigger="+ Add new concept"
                    triggerLabel={`Add a new concept to week ${week.number}`}
                    triggerClassName={addButtonClass}
                    submitLabel="Add concept"
                    action={actions.addConcept.bind(null, week.id)}
                >
                    <p className="-mt-2 text-base text-zinc-600 dark:text-zinc-400">Only {student.name}&apos;s syllabus gets this concept.</p>
                    <ConceptFields />
                </FormDialog>
                {addBackGroups.length > 0 && (
                    <FormDialog
                        title={`Add a concept back to week ${week.number}`}
                        trigger="+ Add back a concept"
                        triggerLabel={`Add a concept back to week ${week.number}`}
                        triggerClassName={addButtonClass}
                        submitLabel="Add concept"
                        action={actions.addBackConcept.bind(null, week.id)}
                    >
                        <p className="-mt-2 text-base text-zinc-600 dark:text-zinc-400">Concepts that aren&apos;t in {student.name}&apos;s syllabus right now.</p>
                        <Field label="Concept" htmlFor="conceptId">
                            <select id="conceptId" name="conceptId" required defaultValue="" className={selectClass} style={selectStyle}>
                                <option value="" disabled>
                                    Choose a concept
                                </option>
                                {addBackGroups.map((group) => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.concepts.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </Field>
                    </FormDialog>
                )}
            </div>
        </section>
    );
}

function WeekSelect({ weekOptions, defaultValue }: { weekOptions: WeekOption[]; defaultValue: string }) {
    return (
        <Field label="Week" htmlFor="weekId">
            <select id="weekId" name="weekId" defaultValue={defaultValue} className={selectClass} style={selectStyle}>
                {weekOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                        {w.label}
                    </option>
                ))}
            </select>
        </Field>
    );
}
