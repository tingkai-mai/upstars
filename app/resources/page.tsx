import { Suspense } from "react";
import type { Metadata } from "next";
import { isAdmin, requireUser } from "@/lib/session";
import { pluralize } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { FormDialog } from "@/components/form-dialog";
import { compactPrimaryButtonClass, inlineEditButtonClass } from "@/components/form";
import { PenIcon } from "@/components/icons";
import { MoveButtons } from "@/components/move-buttons";
import { EmptyState } from "@/app/syllabus/ui";
import { createResource, deleteResource, moveResource, updateResource } from "./actions";
import { ResourceFields } from "./fields";
import { listResources, type Resource } from "./queries";

export const metadata: Metadata = { title: "Upstars resources" };

export default function ResourcesPage() {
    return (
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading resources…</p>}>
                <Resources />
            </Suspense>
        </main>
    );
}

/** Everyone signed in can open resources; only admins see the add, edit and delete buttons. */
async function Resources() {
    const viewer = await requireUser();
    const admin = isAdmin(viewer);
    const resources = await listResources();

    return (
        <>
            <PageHeader
                title="Upstars resources"
                back={{ href: "/", label: "Home" }}
                action={
                    admin && (
                        <FormDialog
                            title="Add resource"
                            trigger="Add resource"
                            triggerLabel="Add resource"
                            triggerClassName={compactPrimaryButtonClass}
                            submitLabel="Add resource"
                            action={createResource}
                        >
                            <ResourceFields />
                        </FormDialog>
                    )
                }
            />

            {resources.length === 0 ? (
                <EmptyState>{admin ? "No resources yet. Add guides, materials and forms for tutors and students." : "No resources yet. Check back later."}</EmptyState>
            ) : (
                <section aria-label="Resources" className="flex flex-col gap-2">
                    <p className="text-base text-zinc-600 dark:text-zinc-400">{pluralize(resources.length, "resource")}</p>
                    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                        {resources.map((r, index) => (
                            <ResourceRow key={r.id} resource={r} admin={admin} isFirst={index === 0} isLast={index === resources.length - 1} />
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}

/** "https://www.example.com/a/b" → "example.com" */
function displayHost(url: string) {
    return new URL(url).hostname.replace(/^www\./, "");
}

type RowProps = { resource: Resource; admin: boolean; isFirst: boolean; isLast: boolean };

function ResourceRow({ resource, admin, isFirst, isLast }: RowProps) {
    return (
        <li className="flex flex-col">
            {/* The whole row opens the link; URLs are checked to be http(s) when saved */}
            <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
            >
                <div className="min-w-0 flex-1">
                    <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{resource.name}</p>
                    {resource.description && <p className="text-base text-zinc-700 dark:text-zinc-300">{resource.description}</p>}
                    <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{displayHost(resource.url)} · opens in a new tab</p>
                </div>
                <span aria-hidden className="shrink-0 text-xl text-zinc-600 dark:text-zinc-400">
                    ↗
                </span>
            </a>
            {admin && (
                // A row of their own, so the link keeps the full width
                <div className="flex items-center justify-end gap-1 px-3 pb-3">
                    <MoveButtons action={moveResource.bind(null, resource.id)} name={resource.name} isFirst={isFirst} isLast={isLast} />
                    <FormDialog
                        title="Edit resource"
                        trigger={
                            <>
                                <PenIcon />
                                Edit
                            </>
                        }
                        triggerLabel={`Edit ${resource.name}`}
                        triggerClassName={inlineEditButtonClass}
                        submitLabel="Save resource"
                        action={updateResource.bind(null, resource.id)}
                        remove={{ action: deleteResource.bind(null, resource.id), label: "Delete resource", confirm: `Delete "${resource.name}"? This can't be undone.` }}
                    >
                        <ResourceFields defaults={resource} />
                    </FormDialog>
                </div>
            )}
        </li>
    );
}
