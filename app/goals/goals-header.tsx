import { PageHeader } from "@/components/page-header";
import { FilterPanel } from "@/components/filter-panel";
import { Tabs } from "@/components/tabs";
import { pluralize } from "@/lib/format";
import { SyllabusFilter } from "@/app/syllabus/syllabus-filter";
import { EmptyState } from "@/app/syllabus/ui";
import type { Progress, ProgressData } from "./context";
import { StudentFilter } from "./student-filter";

export type GoalsTab = "goals" | "syllabus" | "worksheets" | "tests";

const TABS: { key: GoalsTab; label: string; path: string }[] = [
    { key: "goals", label: "Goals", path: "/goals" },
    { key: "syllabus", label: "Syllabus", path: "/goals/syllabus" },
    { key: "worksheets", label: "Worksheets", path: "/goals/worksheets" },
    { key: "tests", label: "Tests", path: "/goals/tests" },
];

/** Header, filters, tabs and progress summary. Returns an empty state instead when there's nothing to show. */
export function GoalsHeader({ tab, progress }: { tab: GoalsTab; progress: Progress }) {
    const { viewer, students, student, selection, data } = progress;
    const query = new URLSearchParams({ ...(student && { student: student.id }), ...(selection.subject && { subject: selection.subject.id }) });

    return (
        <>
            <PageHeader title="Goal tracking" back={{ href: "/", label: "Home" }} />
            {!student ? (
                <EmptyState>No students yet.</EmptyState>
            ) : (
                <>
                    {/* Students only ever see themselves, so they get a heading rather than a picker */}
                    {viewer.role === "student" && <p className="-mt-3 text-base text-zinc-600 dark:text-zinc-400">Your progress</p>}
                    <Tabs label="Goal tracking" tabs={TABS.map((t) => ({ label: t.label, href: `${t.path}?${query}`, active: t.key === tab }))} />
                    {(viewer.role !== "student" || selection.subject) && (
                        <FilterPanel>
                            {viewer.role !== "student" && <StudentFilter students={students} studentId={student.id} />}
                            {selection.subject && <SyllabusFilter subjects={selection.subjects} levels={selection.levels} level={selection.level} subjectId={selection.subject.id} />}
                        </FilterPanel>
                    )}
                    {!data ? <EmptyState>No subjects yet.</EmptyState> : <ProgressSummary data={data} />}
                </>
            )}
        </>
    );
}

export function percent(done: number, total: number) {
    return total === 0 ? 0 : Math.round((done / total) * 100);
}

function ProgressSummary({ data }: { data: ProgressData }) {
    const conceptTotal = data.plan.chapters.reduce((sum, c) => sum + c.weeks.reduce((n, w) => n + w.concepts.length, 0), 0);
    const tiles = [
        { label: "Syllabus", done: data.completion.concepts.size, total: conceptTotal, detail: (done: number, total: number) => `${done}/${pluralize(total, "concept")}` },
        { label: "Worksheets", done: data.completion.worksheets.size, total: data.worksheets.length, detail: (done: number, total: number) => `${done}/${total} done` },
        { label: "Tests", done: data.completion.tests.size, total: data.tests.length, detail: (done: number, total: number) => `${done}/${total} done` },
    ];

    return (
        <section aria-label="Progress" className="flex flex-col gap-2">
            <dl className="grid grid-cols-3 divide-x divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {tiles.map((tile) => (
                    <div key={tile.label} className="flex flex-col gap-2 p-3 sm:p-4">
                        <dt className="text-sm text-zinc-600 sm:text-base dark:text-zinc-400">{tile.label}</dt>
                        <dd className="flex flex-col gap-2">
                            <span className="text-xl font-semibold tabular-nums text-zinc-900 sm:text-2xl dark:text-zinc-50">{percent(tile.done, tile.total)}%</span>
                            <ProgressBar value={percent(tile.done, tile.total)} />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">{tile.detail(tile.done, tile.total)}</span>
                        </dd>
                    </div>
                ))}
            </dl>
            {!data.canEdit && <p className="text-sm text-zinc-600 dark:text-zinc-400">View only. Admins and this student&apos;s tutors can update progress.</p>}
        </section>
    );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
    return (
        <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${value}%` }} />
        </div>
    );
}
