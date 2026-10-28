import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { AdminOnly } from "@/app/volunteers/admin-only";
import { deleteTest, updateTest } from "../../actions";
import { getSubjectPlan, getTest } from "../../queries";
import { TestBuilder } from "../test-builder";

export const metadata: Metadata = { title: "Edit test" };

type Props = PageProps<"/syllabus/tests/[testId]">;

export default function EditTestPage({ params }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-36 sm:px-6 sm:pt-10">
            <Suspense fallback={<p className="text-zinc-600">Loading…</p>}>
                <EditTest params={params} />
            </Suspense>
        </main>
    );
}

async function EditTest({ params }: Pick<Props, "params">) {
    if (!(await getAdminUser())) return <AdminOnly />;
    const { testId } = await params;
    const found = await getTest(testId);
    if (!found) notFound();
    const plan = await getSubjectPlan(found.subjectId);
    if (!plan) notFound();
    const listHref = `/syllabus/tests?subject=${found.subjectId}&type=${found.type}`;

    return (
        <>
            <PageHeader title="Edit test" back={{ href: listHref, label: "Tests" }} />
            <p className="-mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                For {plan.subject.level} {plan.subject.name}.
            </p>
            <TestBuilder
                // Keyed on the saved data, so the builder resets whenever the test changes elsewhere
                key={[found.name, found.type, found.durationMin, ...[...found.chapterIds].sort()].join("|")}
                chapters={plan.chapters}
                defaults={found}
                action={updateTest.bind(null, found.id)}
                submitLabel="Save test"
                listHref={`/syllabus/tests?subject=${found.subjectId}`}
            />
            <section className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Delete this test</h2>
                <p className="text-base text-zinc-600 dark:text-zinc-400">This can&apos;t be undone.</p>
                <DeleteButton action={deleteTest.bind(null, found.id)} label="Delete test" confirm={`Delete ${found.name}? This can't be undone.`} />
            </section>
        </>
    );
}
