import { Suspense } from "react";
import type { Metadata } from "next";
import { formatMinutes, pluralize } from "@/lib/format";
import { EmptyState, formatWeeks } from "@/app/syllabus/ui";
import { loadProgress } from "../context";
import { GoalsHeader } from "../goals-header";
import { CompletionRow } from "../completion-checkbox";
import { CompletedOn, CompletionList, completionItemClass } from "../completion-table";

export const metadata: Metadata = { title: "Worksheet progress" };

type Props = PageProps<"/goals/worksheets">;

export default function WorksheetProgressPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading progress…</p>}>
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
                <CompletionList label="Worksheets">
                    {data.worksheets.map((sheet) => {
                        const completedAt = data.completion.worksheets.get(sheet.id);
                        const weeks = sheet.concepts.length ? formatWeeks(sheet.concepts.map((c) => c.weekNumber)) : "No concepts";
                        return (
                            <li key={sheet.id} className={completionItemClass}>
                                <CompletionRow kind="worksheet" studentId={student.id} itemId={sheet.id} done={Boolean(completedAt)} label={sheet.name} editable={data.canEdit}>
                                    <span className="block text-lg font-medium text-zinc-900 dark:text-zinc-50">{sheet.name}</span>
                                    <span className="block text-base text-zinc-600 dark:text-zinc-400">
                                        {weeks} · {pluralize(sheet.concepts.length, "concept")}
                                        {sheet.durationMin !== null && ` · ${formatMinutes(sheet.durationMin)}`}
                                    </span>
                                    {completedAt && <CompletedOn date={completedAt} />}
                                </CompletionRow>
                            </li>
                        );
                    })}
                </CompletionList>
            )}
        </>
    );
}
