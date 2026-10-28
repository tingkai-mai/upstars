import { Field, inputClass, selectClass, selectStyle } from "@/components/form";
import type { Goal } from "./queries";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function MarksInput({ name, label, defaultValue, required = true, hint }: { name: string; label: string; defaultValue?: number | null; required?: boolean; hint?: string }) {
    return (
        <Field label={label} htmlFor={name} hint={hint}>
            <input id={name} name={name} type="number" inputMode="numeric" min={0} step={1} required={required} defaultValue={defaultValue ?? undefined} className={inputClass} />
        </Field>
    );
}

/** Fields for adding or editing a goal. New goals default to the current month and 100 marks. */
export function GoalFields({ defaults, now }: { defaults?: Goal; now: { year: number; month: number } }) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Exam month" htmlFor="month">
                    <select id="month" name="month" defaultValue={defaults?.month ?? now.month} className={selectClass} style={selectStyle}>
                        {MONTHS.map((label, index) => (
                            <option key={label} value={index + 1}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Year" htmlFor="year">
                    <input id="year" name="year" type="number" inputMode="numeric" min={2000} max={2100} step={1} required defaultValue={defaults?.year ?? now.year} className={inputClass} />
                </Field>
            </div>
            <p className="-mt-2 text-sm text-zinc-600 dark:text-zinc-400">One goal per quarter of the year: Jan–Mar is Q1, Apr–Jun Q2, Jul–Sep Q3, Oct–Dec Q4.</p>
            <MarksInput name="totalMarks" label="The exam is out of (marks)" defaultValue={defaults?.totalMarks ?? 100} />
            <MarksInput name="targetMarks" label="Target marks" defaultValue={defaults?.targetMarks} />
            <MarksInput name="actualMarks" label="Result marks (optional)" defaultValue={defaults?.actualMarks} required={false} hint="Leave blank until the exam is marked." />
        </>
    );
}
