import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AdminOnly } from "@/app/volunteers/admin-only";
import { createWorksheet } from "../../actions";
import { getSubjectPlan } from "../../queries";
import { resolveSelection } from "../../selection";
import { EmptyState } from "../../ui";
import { WorksheetBuilder } from "../worksheet-builder";

export const metadata: Metadata = { title: "New worksheet" };

type Props = PageProps<"/syllabus/worksheets/new">;

export default function NewWorksheetPage({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-36 sm:px-6 sm:pt-10">
            <Suspense fallback={<p className="text-zinc-600">Loading…</p>}>
                <NewWorksheet searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function NewWorksheet({ searchParams }: Pick<Props, "searchParams">) {
    if (!(await getAdminUser())) return <AdminOnly />;
    const { subject } = await resolveSelection(await searchParams);
    const plan = subject ? await getSubjectPlan(subject.id) : null;
    const listHref = `/syllabus/worksheets${subject ? `?subject=${subject.id}` : ""}`;

    return (
        <>
            <PageHeader title="New worksheet" back={{ href: listHref, label: "Worksheets" }} />
            {!plan ? (
                <EmptyState>Add a subject first, using Edit levels &amp; subjects on the Syllabus page.</EmptyState>
            ) : (
                <>
                    <p className="-mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                        For {plan.subject.level} {plan.subject.name}. Choose the concepts it covers.
                    </p>
                    <WorksheetBuilder chapters={plan.chapters} defaults={{ name: "", conceptIds: [] }} action={createWorksheet.bind(null, plan.subject.id)} submitLabel="Create worksheet" doneHref={listHref} />
                </>
            )}
        </>
    );
}
