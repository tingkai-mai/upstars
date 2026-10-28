import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { compactPrimaryButtonClass, inlineEditButtonClass } from "@/components/form";
import { PenIcon } from "@/components/icons";
import { isAdmin, requireUser } from "@/lib/session";
import { formatMinutes, pluralize } from "@/lib/format";
import { isTestType, TEST_TYPE_LABELS, type TestType } from "@/lib/tests";
import { getSubjectPlan, listTests, type Chapter, type TestSummary } from "../queries";
import { resolveSelection } from "../selection";
import { SyllabusHeader } from "../syllabus-header";
import { Accordion, EmptyState, formatWeeks } from "../ui";

export const metadata: Metadata = { title: "Tests" };

type Props = PageProps<"/syllabus/tests">;

export default function TestsPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading tests…</p>}>
                <TestsTab searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function TestsTab({ searchParams }: Pick<Props, "searchParams">) {
    const [user, params] = await Promise.all([requireUser(), searchParams]);
    const selection = await resolveSelection(params);
    const subject = selection.subject;
    const [plan, tests] = subject ? await Promise.all([getSubjectPlan(subject.id), listTests(subject.id)]) : [null, []];
    const canEdit = isAdmin(user);
    const type: TestType = isTestType(params.type) ? params.type : "capstone";
    const labels = TEST_TYPE_LABELS[type];
    const shown = plan ? sortByFirstWeek(tests.filter((t) => t.type === type), plan.chapters) : [];

    return (
        <>
            <SyllabusHeader tab="tests" selection={selection} canEdit={canEdit} testType={type} />

            {!subject || !plan ? (
                <EmptyState>No subjects yet.{canEdit && " Use Edit levels & subjects above to add one."}</EmptyState>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{pluralize(shown.length, labels.one.toLowerCase(), labels.many.toLowerCase())}</h2>
                        {canEdit && (
                            <Link href={`/syllabus/tests/new?subject=${subject.id}&type=${type}`} className={compactPrimaryButtonClass}>
                                New test
                            </Link>
                        )}
                    </div>

                    {shown.length === 0 ? (
                        <EmptyState>No {labels.many.toLowerCase()} yet.</EmptyState>
                    ) : (
                        <section aria-label={labels.many} className="flex flex-col gap-3">
                            {shown.map((t) => (
                                <TestAccordion key={t.id} test={t} chapters={plan.chapters} canEdit={canEdit} />
                            ))}
                        </section>
                    )}
                </>
            )}
        </>
    );
}

/** The test's chapters, in syllabus order */
function chaptersOf(test: TestSummary, chapters: Chapter[]) {
    return chapters.filter((c) => test.chapterIds.includes(c.id));
}

function sortByFirstWeek(tests: TestSummary[], chapters: Chapter[]) {
    const firstWeek = (t: TestSummary) => Math.min(...chaptersOf(t, chapters).flatMap((c) => c.weeks.map((w) => w.number)));
    return [...tests].sort((a, b) => firstWeek(a) - firstWeek(b) || a.name.localeCompare(b.name));
}

function TestAccordion({ test, chapters, canEdit }: { test: TestSummary; chapters: Chapter[]; canEdit: boolean }) {
    const covered = chaptersOf(test, chapters);
    const weeks = covered.flatMap((c) => c.weeks.map((w) => w.number));
    const conceptCount = covered.reduce((sum, c) => sum + c.weeks.reduce((n, w) => n + w.concepts.length, 0), 0);
    const time = test.durationMin === null ? "Time not set" : formatMinutes(test.durationMin);

    return (
        <Accordion title={test.name} subtitle={`${formatWeeks(weeks)} · ${pluralize(covered.length, "chapter")} · ${pluralize(conceptCount, "concept")} · ${time}`}>
            {covered.length === 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">This test has no chapters left. Edit it to choose some.</p>
            ) : (
                <>
                    {test.durationMin !== null && conceptCount > 1 && <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMinutes(test.durationMin / conceptCount)} per concept</p>}
                    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <table className="w-full border-collapse text-left text-base">
                            <thead className="bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                <tr>
                                    <th scope="col" className="px-3 py-2 font-medium">
                                        Chapter
                                    </th>
                                    <th scope="col" className="px-3 py-2 font-medium">
                                        Weeks
                                    </th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">
                                        Concepts
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {covered.map((c) => (
                                    <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
                                        <th scope="row" className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                                            {c.name}
                                        </th>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatWeeks(c.weeks.map((w) => w.number)).replace(/^Weeks? /, "")}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{c.weeks.reduce((n, w) => n + w.concepts.length, 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            {canEdit && (
                <div className="flex justify-end">
                    <Link href={`/syllabus/tests/${test.id}`} className={inlineEditButtonClass}>
                        <PenIcon />
                        Edit test
                    </Link>
                </div>
            )}
        </Accordion>
    );
}
