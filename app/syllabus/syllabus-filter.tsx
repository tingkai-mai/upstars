"use client";
import { FilterSelect, useUrlFilters } from "@/components/url-filters";
import { TEST_TYPES, TEST_TYPE_LABELS, type TestType } from "@/lib/tests";

type Props = {
    subjects: { id: string; level: string; name: string }[];
    levels: string[];
    level?: string;
    subjectId?: string;
    /** Shows a third filter for test type (Tests tab only) */
    testType?: TestType;
};

export function SyllabusFilter({ subjects, levels, level, subjectId, testType }: Props) {
    const { pending, update } = useUrlFilters();
    const levelSubjects = subjects.filter((s) => s.level === level);

    function selectLevel(nextLevel: string) {
        const first = subjects.find((s) => s.level === nextLevel);
        if (first) update({ subject: first.id });
    }

    return (
        <div
            className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 transition-opacity ${testType ? "sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,3fr)]" : ""} ${pending ? "opacity-60" : ""}`}
            aria-busy={pending}
        >
            <FilterSelect id="filter-level" label="Level" value={level ?? ""} onChange={selectLevel} options={levels.map((l) => ({ value: l, label: l }))} />
            <FilterSelect id="filter-subject" label="Subject" value={subjectId ?? ""} onChange={(id) => update({ subject: id })} options={levelSubjects.map((s) => ({ value: s.id, label: s.name }))} />
            {testType && (
                // Only two types, so both are shown as buttons rather than hidden in a dropdown
                <fieldset className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                    <legend className="mb-1.5 text-base font-medium text-zinc-800 dark:text-zinc-300">Type</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {TEST_TYPES.map((t) => (
                            <button
                                key={t}
                                type="button"
                                aria-pressed={t === testType}
                                onClick={() => update({ type: t })}
                                className={`h-12 rounded-xl border px-2 text-base font-medium transition ${
                                    t === testType
                                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                                        : "border-zinc-400 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                                }`}
                            >
                                {TEST_TYPE_LABELS[t].many}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}
        </div>
    );
}
