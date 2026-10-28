import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { compactPrimaryButtonClass, inlineEditButtonClass } from "@/components/form";
import { PenIcon } from "@/components/icons";
import { isAdmin, requireUser } from "@/lib/session";
import { formatMinutes, pluralize } from "@/lib/format";
import { listWorksheets, type WorksheetSummary } from "../queries";
import { resolveSelection } from "../selection";
import { SyllabusHeader } from "../syllabus-header";
import { Accordion, EmptyState, formatWeeks } from "../ui";

export const metadata: Metadata = { title: "Worksheets" };

type Props = PageProps<"/syllabus/worksheets">;

export default function WorksheetsPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading worksheets…</p>}>
                <WorksheetsTab searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function WorksheetsTab({ searchParams }: Pick<Props, "searchParams">) {
    const [user, params] = await Promise.all([requireUser(), searchParams]);
    const selection = await resolveSelection(params);
    const subject = selection.subject;
    const worksheets = subject ? await listWorksheets(subject.id) : [];
    const canEdit = isAdmin(user);

    return (
        <>
            <SyllabusHeader tab="worksheets" selection={selection} canEdit={canEdit} />

            {!subject ? (
                <EmptyState>No subjects yet.{canEdit && " Use Subjects above to add one."}</EmptyState>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{pluralize(worksheets.length, "worksheet")}</h2>
                        {canEdit && (
                            <Link href={`/syllabus/worksheets/new?subject=${subject.id}`} className={compactPrimaryButtonClass}>
                                New worksheet
                            </Link>
                        )}
                    </div>

                    {worksheets.length === 0 ? (
                        <EmptyState>No worksheets for this subject yet.</EmptyState>
                    ) : (
                        <section aria-label="Worksheets" className="flex flex-col gap-3">
                            {worksheets.map((sheet) => (
                                <WorksheetAccordion key={sheet.id} sheet={sheet} canEdit={canEdit} />
                            ))}
                        </section>
                    )}
                </>
            )}
        </>
    );
}

function WorksheetAccordion({ sheet, canEdit }: { sheet: WorksheetSummary; canEdit: boolean }) {
    const perConcept = sheet.durationMin !== null && sheet.concepts.length > 0 ? sheet.durationMin / sheet.concepts.length : null;

    return (
        <Accordion title={sheet.name} subtitle={`${sheet.concepts.length ? formatWeeks(sheet.concepts.map((c) => c.weekNumber)) : "No concepts"} · ${pluralize(sheet.concepts.length, "concept")} · ${sheet.durationMin === null ? "Time not set" : formatMinutes(sheet.durationMin)}`}>
            {sheet.concepts.length === 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">This worksheet has no concepts left. Edit it to choose some.</p>
            ) : (
                <>
                    {perConcept !== null && sheet.concepts.length > 1 && <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMinutes(perConcept)} per concept</p>}
                    <ol className="flex flex-col gap-1">
                        {sheet.concepts.map((concept, index) => (
                            <li key={concept.id} className="flex items-start gap-3 text-base text-zinc-800 dark:text-zinc-200">
                                <span className="w-5 shrink-0 pt-px text-right tabular-nums text-zinc-400">{index + 1}.</span>
                                <span className="flex-1">{concept.name}</span>
                                <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-sm tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Week {concept.weekNumber}</span>
                            </li>
                        ))}
                    </ol>
                </>
            )}
            {canEdit && (
                <div className="flex justify-end">
                    <Link href={`/syllabus/worksheets/${sheet.id}`} className={inlineEditButtonClass}>
                        <PenIcon />
                        Edit worksheet
                    </Link>
                </div>
            )}
        </Accordion>
    );
}
