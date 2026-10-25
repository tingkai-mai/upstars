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
                <FilterSelect
                    id="filter-type"
                    label="Type"
                    value={testType}
                    onChange={(type) => update({ type })}
                    options={TEST_TYPES.map((t) => ({ value: t, label: TEST_TYPE_LABELS[t].many }))}
                    className="col-span-2 sm:col-span-1"
                />
            )}
        </div>
    );
}
