import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { AdminOnly } from "@/app/volunteers/admin-only";
import { deleteWorksheet, updateWorksheet } from "../../actions";
import { getSubjectPlan, getWorksheet } from "../../queries";
import { WorksheetBuilder } from "../worksheet-builder";

export const metadata: Metadata = { title: "Edit worksheet" };

type Props = PageProps<"/syllabus/worksheets/[worksheetId]">;

export default function EditWorksheetPage({ params }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-36 sm:px-6 sm:pt-10">
            <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
                <EditWorksheet params={params} />
            </Suspense>
        </main>
    );
}

async function EditWorksheet({ params }: Pick<Props, "params">) {
    if (!(await getAdminUser())) return <AdminOnly />;
    const { worksheetId } = await params;
    const sheet = await getWorksheet(worksheetId);
    if (!sheet) notFound();
    const plan = await getSubjectPlan(sheet.subjectId);
    if (!plan) notFound();
    const listHref = `/syllabus/worksheets?subject=${sheet.subjectId}`;

    return (
        <>
            <PageHeader title="Edit worksheet" back={{ href: listHref, label: "Worksheets" }} />
            <p className="-mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                For {plan.subject.level} {plan.subject.name}.
            </p>
            <WorksheetBuilder
                // Keyed on the saved data, so the builder resets whenever the worksheet changes elsewhere
                key={[sheet.name, sheet.durationMin, ...[...sheet.conceptIds].sort()].join("|")}
                chapters={plan.chapters}
                defaults={sheet}
                action={updateWorksheet.bind(null, sheet.id)}
                submitLabel="Save worksheet"
                doneHref={listHref}
            />
            <section className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Danger zone</h2>
                <DeleteButton action={deleteWorksheet.bind(null, sheet.id)} label="Delete worksheet" confirm={`Delete ${sheet.name}? This can't be undone.`} />
            </section>
        </>
    );
}
