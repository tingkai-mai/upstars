"use client";
import { FilterSelect, useUrlFilters } from "@/components/url-filters";

type Props = { students: { id: string; name: string; currentLevel?: string | null; group?: string }[]; studentId: string };

/** Picks the student, kept in the URL so both check-in modals share the choice. */
export function StudentPicker({ students, studentId }: Props) {
    const { pending, update } = useUrlFilters();
    return (
        <div className={`transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
            <FilterSelect id="check-in-student" label="Student" value={studentId} onChange={(id) => update({ student: id })} options={students.map((s) => ({ value: s.id, label: s.currentLevel ? `${s.name} · ${s.currentLevel}` : s.name, group: s.group }))} />
        </div>
    );
}
