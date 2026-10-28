"use client";
import { useState } from "react";
import { pluralize } from "@/lib/format";
import type { Chapter } from "../queries";
import { NameAndTimeFields, SaveBar, useBuilderSubmit } from "../builder";

type Props = {
    chapters: Chapter[];
    defaults: { name: string; durationMin?: number | null; conceptIds: string[] };
    action: (formData: FormData) => Promise<{ error?: string }>;
    submitLabel: string;
    /** Where to go after saving */
    doneHref: string;
};

export function WorksheetBuilder({ chapters, defaults, action, submitLabel, doneHref }: Props) {
    const [selected, setSelected] = useState(() => new Set(defaults.conceptIds));
    const { error, pending, handleSubmit } = useBuilderSubmit(action, doneHref, () => setSelected(new Set(defaults.conceptIds)));

    function toggle(ids: string[], checked: boolean) {
        setSelected((current) => {
            const next = new Set(current);
            for (const id of ids) {
                if (checked) next.add(id);
                else next.delete(id);
            }
            return next;
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <NameAndTimeFields noun="Worksheet" namePlaceholder="e.g. FractionWS(Wk 8)" timeHint="Split evenly across the chosen concepts." defaults={defaults} />

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-base font-medium text-zinc-800 dark:text-zinc-200">Concepts</legend>
                {chapters.length === 0 && <p className="text-base text-zinc-600">This subject has no concepts yet. Add some in the Syllabus tab.</p>}
                {chapters.map((chapter) => (
                    <ChapterPicker key={chapter.id} chapter={chapter} selected={selected} onToggle={toggle} />
                ))}
            </fieldset>

            <SaveBar summary={`${pluralize(selected.size, "concept")} selected`} error={error} pending={pending} canSubmit={selected.size > 0} submitLabel={submitLabel} />
        </form>
    );
}

type PickerProps = {
    chapter: Chapter;
    selected: Set<string>;
    onToggle: (ids: string[], checked: boolean) => void;
    /** Concepts to tag as already done, e.g. a student's completed ones */
    doneIds?: Set<string>;
    defaultOpen?: boolean;
};

export function ChapterPicker({ chapter, selected, onToggle, doneIds, defaultOpen = false }: PickerProps) {
    const ids = chapter.weeks.flatMap((w) => w.concepts.map((c) => c.id));
    const count = ids.filter((id) => selected.has(id)).length;
    // Open chapters that start with selections (or are asked to), so editing shows what's chosen. Only the initial
    // value is used: a live value would snap the chapter shut when its last concept is unticked.
    const [initiallyOpen] = useState(defaultOpen || count > 0);
    if (ids.length === 0) return null;

    return (
        <details open={initiallyOpen} className="group/picker rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{chapter.name}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium tabular-nums ${count ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                    {count}/{ids.length}
                </span>
                <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5 shrink-0 text-zinc-600 transition group-open/picker:rotate-180 dark:text-zinc-400">
                    <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </summary>
            <div className="flex flex-col gap-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
                {chapter.weeks
                    .filter((w) => w.concepts.length > 0)
                    .map((week) => {
                        const weekIds = week.concepts.map((c) => c.id);
                        const weekCount = weekIds.filter((id) => selected.has(id)).length;
                        const allChecked = weekCount === weekIds.length;
                        return (
                            <div key={week.id} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/60">
                                <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        // Partially selected weeks show a dash
                                        ref={(el) => {
                                            if (el) el.indeterminate = weekCount > 0 && !allChecked;
                                        }}
                                        onChange={(event) => onToggle(weekIds, event.target.checked)}
                                        className="size-6 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                                    />
                                    Week {week.number}{" "}
                                    <span className="font-normal text-zinc-600 dark:text-zinc-400">· Select all</span>
                                </label>
                                <ul className="flex flex-col">
                                    {week.concepts.map((concept) => (
                                        <li key={concept.id}>
                                            <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1 pl-9 text-base text-zinc-800 dark:text-zinc-200">
                                                <input
                                                    type="checkbox"
                                                    name="conceptId"
                                                    value={concept.id}
                                                    checked={selected.has(concept.id)}
                                                    onChange={(event) => onToggle([concept.id], event.target.checked)}
                                                    className="size-6 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                                                />
                                                {concept.name}
                                                {doneIds?.has(concept.id) && <DoneTag />}
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
            </div>
        </details>
    );
}

export function DoneTag() {
    return <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Done</span>;
}
