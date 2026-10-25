import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AdminOnly } from "../admin-only";
import { RoleBadge } from "../role-badge";
import { getUser, listPairedPeople } from "../queries";

export const metadata: Metadata = { title: "User profile" };

type Props = PageProps<"/volunteers/[id]">;

export default function UserProfilePage({ params }: Props) {
    return (
        <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
            <UserProfile params={params} />
        </Suspense>
    );
}

async function UserProfile({ params }: Pick<Props, "params">) {
    const admin = await getAdminUser();
    if (!admin) return <AdminOnly />;

    const { id } = await params;
    const member = await getUser(id);
    if (!member) notFound();
    const pairedPeople = await listPairedPeople(id, member.role);
    const pairedLabel = member.role === "tutor" ? "Students" : "Tutors";

    return (
        <>
            <PageHeader
                title={member.name}
                back={{ href: "/volunteers", label: "Users" }}
                action={
                    <Link
                        href={`/volunteers/${id}/edit`}
                        className="inline-flex h-10 shrink-0 items-center rounded-xl border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                        Edit
                    </Link>
                }
            />

            <dl className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                <Detail label="Email">
                    <a href={`mailto:${member.email}`} className="break-all text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50">
                        {member.email}
                    </a>
                </Detail>
                <Detail label="Role">
                    <RoleBadge role={member.role} />
                    {id === admin.id && <span className="ml-2 text-sm text-zinc-500">(you)</span>}
                </Detail>
                <Detail label="Level">
                    {member.currentLevel ? <span className="text-zinc-900 dark:text-zinc-50">{member.currentLevel}</span> : <span className="text-zinc-400">Not set</span>}
                </Detail>
            </dl>

            {member.role !== "admin" && (
                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            {pairedLabel} <span className="font-normal text-zinc-500">({pairedPeople.length})</span>
                        </h2>
                        <Link
                            href={`/volunteers/pairings?q=${encodeURIComponent(member.email)}`}
                            className="text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
                        >
                            Manage pairings
                        </Link>
                    </div>

                    {pairedPeople.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                            No {pairedLabel.toLowerCase()} assigned yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                            {pairedPeople.map((person) => (
                                <li key={person.id}>
                                    <Link
                                        href={`/volunteers/${person.id}`}
                                        className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{person.name}</p>
                                            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{person.email}</p>
                                        </div>
                                        <span aria-hidden className="text-zinc-400">›</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </>
    );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <dt className="text-sm text-zinc-500 sm:w-24 dark:text-zinc-400">{label}</dt>
            <dd className="flex items-center">{children}</dd>
        </div>
    );
}
