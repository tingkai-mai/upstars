import { Suspense } from "react";
import type { Metadata } from "next";
import { formatMinutes, pluralize } from "@/lib/format";
import { EmptyState, formatWeeks } from "@/app/syllabus/ui";
import { loadProgress } from "../context";
import { GoalsHeader } from "../goals-header";
import { CompletionCheckbox } from "../completion-checkbox";
import { CompletionTable, formatCompletedOn } from "../completion-table";

export const metadata: Metadata = { title: "Worksheet progress" };

type Props = PageProps<"/goals/worksheets">;

export default function WorksheetProgressPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-500">Loading progress…</p>}>
                <WorksheetProgress searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function WorksheetProgress({ searchParams }: Pick<Props, "searchParams">) {
    const progress = await loadProgress(await searchParams);
    const { student, data } = progress;
    if (!student || !data) return <GoalsHeader tab="worksheets" progress={progress} />;

    return (
        <>
            <GoalsHeader tab="worksheets" progress={progress} />
            {data.worksheets.length === 0 ? (
                <EmptyState>This subject has no worksheets yet.</EmptyState>
            ) : (
                <CompletionTable itemLabel="Worksheet">
                    {data.worksheets.map((sheet) => {
                        const completedAt = data.completion.worksheets.get(sheet.id);
                        const weeks = sheet.concepts.length ? formatWeeks(sheet.concepts.map((c) => c.weekNumber)) : "No concepts";
                        return (
                            <tr key={sheet.id} className="border-t border-zinc-200 dark:border-zinc-800">
                                <td className="px-3 py-2.5 align-top">
                                    <span className="block font-medium text-zinc-900 dark:text-zinc-50">{sheet.name}</span>
                                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                        {weeks} · {pluralize(sheet.concepts.length, "concept")}
                                        {sheet.durationMin !== null && ` · ${formatMinutes(sheet.durationMin)}`}
                                        {completedAt && ` · Done ${formatCompletedOn(completedAt)}`}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-center align-top">
                                    <CompletionCheckbox kind="worksheet" studentId={student.id} itemId={sheet.id} done={Boolean(completedAt)} label={sheet.name} editable={data.canEdit} />
                                </td>
                            </tr>
                        );
                    })}
                </CompletionTable>
            )}
        </>
    );
}
