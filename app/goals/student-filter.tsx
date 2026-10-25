"use client";
import { FilterSelect, useUrlFilters } from "@/components/url-filters";

type Props = { students: { id: string; name: string; email: string }[]; studentId: string };

export function StudentFilter({ students, studentId }: Props) {
    const { pending, update } = useUrlFilters();
    return (
        <div className={`transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
            <FilterSelect id="filter-student" label="Student" value={studentId} onChange={(id) => update({ student: id })} options={students.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
    );
}
