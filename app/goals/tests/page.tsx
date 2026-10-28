import { Suspense } from "react";
import type { Metadata } from "next";
import { formatMinutes, pluralize } from "@/lib/format";
import { TEST_TYPE_LABELS } from "@/lib/tests";
import { EmptyState, formatWeeks } from "@/app/syllabus/ui";
import { loadProgress } from "../context";
import { GoalsHeader } from "../goals-header";
import { CompletionCheckbox } from "../completion-checkbox";
import { CompletionTable, formatCompletedOn } from "../completion-table";

export const metadata: Metadata = { title: "Test progress" };

type Props = PageProps<"/goals/tests">;

export default function TestProgressPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading progress…</p>}>
                <TestProgress searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function TestProgress({ searchParams }: Pick<Props, "searchParams">) {
    const progress = await loadProgress(await searchParams);
    const { student, data } = progress;
    if (!student || !data) return <GoalsHeader tab="tests" progress={progress} />;

    // Syllabus order: by the first week each test covers
    const firstWeek = (chapterIds: string[]) => Math.min(...data.plan.chapters.filter((c) => chapterIds.includes(c.id)).flatMap((c) => c.weeks.map((w) => w.number)));
    const tests = [...data.tests].sort((a, b) => firstWeek(a.chapterIds) - firstWeek(b.chapterIds) || a.name.localeCompare(b.name));

    return (
        <>
            <GoalsHeader tab="tests" progress={progress} />
            {tests.length === 0 ? (
                <EmptyState>This subject has no tests yet.</EmptyState>
            ) : (
                <CompletionTable itemLabel="Test">
                    {tests.map((t) => {
                        const completedAt = data.completion.tests.get(t.id);
                        const chapters = data.plan.chapters.filter((c) => t.chapterIds.includes(c.id));
                        return (
                            <tr key={t.id} className="border-t border-zinc-200 dark:border-zinc-800">
                                <td className="px-3 py-2.5 align-top">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{t.name}</span>
                                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{TEST_TYPE_LABELS[t.type].one}</span>
                                    </span>
                                    <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                                        {formatWeeks(chapters.flatMap((c) => c.weeks.map((w) => w.number)))} · {pluralize(chapters.length, "chapter")}
                                        {t.durationMin !== null && ` · ${formatMinutes(t.durationMin)}`}
                                        {completedAt && ` · Done ${formatCompletedOn(completedAt)}`}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-center align-top">
                                    <CompletionCheckbox kind="test" studentId={student.id} itemId={t.id} done={Boolean(completedAt)} label={t.name} editable={data.canEdit} />
                                </td>
                            </tr>
                        );
                    })}
                </CompletionTable>
            )}
        </>
    );
}
