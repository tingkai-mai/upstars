import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminUser } from "@/lib/session";
import { isTestType } from "@/lib/tests";
import { PageHeader } from "@/components/page-header";
import { AdminOnly } from "@/app/volunteers/admin-only";
import { createTest } from "../../actions";
import { getSubjectPlan } from "../../queries";
import { resolveSelection } from "../../selection";
import { EmptyState } from "../../ui";
import { TestBuilder } from "../test-builder";

export const metadata: Metadata = { title: "New test" };

type Props = PageProps<"/syllabus/tests/new">;

export default function NewTestPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-36 sm:px-6 sm:pt-10">
            <Suspense fallback={<p className="text-zinc-600">Loading…</p>}>
                <NewTest searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function NewTest({ searchParams }: Pick<Props, "searchParams">) {
    if (!(await getAdminUser())) return <AdminOnly />;
    const params = await searchParams;
    const { subject } = await resolveSelection(params);
    const type = isTestType(params.type) ? params.type : "capstone";
    const plan = subject ? await getSubjectPlan(subject.id) : null;
    const listHref = `/syllabus/tests?${subject ? `subject=${subject.id}&` : ""}type=${type}`;

    return (
        <>
            <PageHeader title="New test" back={{ href: listHref, label: "Tests" }} />
            {!plan ? (
                <EmptyState>Add a subject first, using Manage subjects.</EmptyState>
            ) : (
                <>
                    <p className="-mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                        For {plan.subject.level} {plan.subject.name}. Choose the chapters it covers.
                    </p>
                    <TestBuilder chapters={plan.chapters} defaults={{ name: "", type, chapterIds: [] }} action={createTest.bind(null, plan.subject.id)} submitLabel="Create test" listHref={`/syllabus/tests?subject=${plan.subject.id}`} />
                </>
            )}
        </>
    );
}
