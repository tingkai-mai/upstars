"use client";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { selectClass, selectStyle } from "@/components/form";
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
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pending, startTransition] = useTransition();
    const levelSubjects = subjects.filter((s) => s.level === level);

    function update(changes: Record<string, string>) {
        const params = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(changes)) params.set(key, value);
        params.delete("level");
        startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
    }

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

type FilterSelectProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
};

function FilterSelect({ id, label, value, onChange, options, className = "" }: FilterSelectProps) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {label}
            </label>
            <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass} style={selectStyle}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
