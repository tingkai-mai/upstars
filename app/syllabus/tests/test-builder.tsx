"use client";
import { useState } from "react";
import { pluralize } from "@/lib/format";
import { TEST_TYPES, TEST_TYPE_LABELS, type TestType } from "@/lib/tests";
import type { Chapter } from "../queries";
import { NameAndTimeFields, SaveBar, useBuilderSubmit } from "../builder";
import { formatWeeks } from "../ui";

type Props = {
    chapters: Chapter[];
    defaults: { name: string; type: TestType; durationMin?: number | null; chapterIds: string[] };
    action: (formData: FormData) => Promise<{ error?: string }>;
    submitLabel: string;
    /** The tests list for this subject; after saving it opens filtered to the saved type */
    listHref: string;
};

const conceptCount = (chapter: Chapter) => chapter.weeks.reduce((sum, w) => sum + w.concepts.length, 0);

export function TestBuilder({ chapters, defaults, action, submitLabel, listHref }: Props) {
    const [selected, setSelected] = useState(() => new Set(defaults.chapterIds));
    const { error, pending, handleSubmit } = useBuilderSubmit(action, (formData) => `${listHref}&type=${formData.get("type")}`, () => setSelected(new Set(defaults.chapterIds)));

    function toggle(id: string, checked: boolean) {
        setSelected((current) => {
            const next = new Set(current);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }

    const concepts = chapters.filter((c) => selected.has(c.id)).reduce((sum, c) => sum + conceptCount(c), 0);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</legend>
                <div className="grid grid-cols-2 gap-2">
                    {/* Uncontrolled and styled with :has(:checked), so a tap before hydration still counts */}
                    {TEST_TYPES.map((option) => (
                        <label
                            key={option}
                            className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900/20 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:has-[:checked]:border-zinc-50 dark:has-[:checked]:bg-zinc-50 dark:has-[:checked]:text-zinc-900"
                        >
                            <input type="radio" name="type" value={option} defaultChecked={defaults.type === option} className="sr-only" />
                            {TEST_TYPE_LABELS[option].one}
                        </label>
                    ))}
                </div>
            </fieldset>

            <NameAndTimeFields noun="Test" namePlaceholder="e.g. Capstone Check 3" timeHint="Split evenly across the concepts in the chosen chapters." defaults={defaults} />

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Chapters</legend>
                {chapters.length === 0 && <p className="text-sm text-zinc-500">This subject has no chapters yet. Add some in the Syllabus tab.</p>}
                <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {chapters.map((chapter) => (
                        <li key={chapter.id}>
                            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                <input
                                    type="checkbox"
                                    name="chapterId"
                                    value={chapter.id}
                                    checked={selected.has(chapter.id)}
                                    onChange={(event) => toggle(chapter.id, event.target.checked)}
                                    className="size-5 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium text-zinc-900 dark:text-zinc-50">{chapter.name}</span>
                                    <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                                        {formatWeeks(chapter.weeks.map((w) => w.number))} · {pluralize(conceptCount(chapter), "concept")}
                                    </span>
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>
            </fieldset>

            <SaveBar
                summary={`${pluralize(selected.size, "chapter")} · ${pluralize(concepts, "concept")}`}
                error={error}
                pending={pending}
                canSubmit={selected.size > 0}
                submitLabel={submitLabel}
            />
        </form>
    );
}
