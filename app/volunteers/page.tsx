import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { isAdmin, requireUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Toast } from "@/components/toast";
import { RoleBadge } from "./role-badge";
import { VolunteerTabs } from "./volunteer-tabs";

export const metadata: Metadata = { title: "Volunteer management" };

const NOTICES: Record<string, string> = { "admin-profile": "Admin has no profile" };

type Props = PageProps<"/volunteers">;

export default function VolunteersPage({ searchParams }: Props) {
    return (
        <Suspense fallback={<p className="text-zinc-500">Loading users…</p>}>
            <UserList searchParams={searchParams} />
        </Suspense>
    );
}

/** Admins manage everyone; tutors can browse everyone's profiles; students only have their own. */
async function UserList({ searchParams }: Pick<Props, "searchParams">) {
    const viewer = await requireUser();
    if (viewer.role === "student") redirect(`/volunteers/${viewer.id}`);
    const admin = isAdmin(viewer);
    const { notice } = await searchParams;
    const noticeMessage = typeof notice === "string" ? NOTICES[notice] : undefined;

    const users = await db
        .select({ id: user.id, name: user.name, email: user.email, role: user.role, currentLevel: user.currentLevel })
        .from(user)
        .orderBy(asc(user.name));

    return (
        <>
            <PageHeader title="Volunteer management" back={{ href: "/", label: "Home" }} />
            <VolunteerTabs active="users" />
            {noticeMessage && <Toast message={noticeMessage} />}

            <div className="flex min-h-10 items-center justify-between gap-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {users.length} {users.length === 1 ? "user" : "users"}
                </p>
                {admin && (
                    <Link
                        href="/volunteers/new"
                        className="inline-flex h-10 shrink-0 items-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        Add user
                    </Link>
                )}
            </div>

            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {users.map((member) => (
                    <li key={member.id}>
                        <Link
                            // Admins have no profile, so admins go straight to editing them
                            href={admin && member.role === "admin" ? `/volunteers/${member.id}/edit` : `/volunteers/${member.id}`}
                            className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                    {member.name}
                                    {member.id === viewer.id && <span className="font-normal text-zinc-500"> (you)</span>}
                                </p>
                                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                    {member.email}
                                    {member.currentLevel && ` · ${member.currentLevel}`}
                                </p>
                            </div>
                            <RoleBadge role={member.role} />
                            <span aria-hidden className="text-zinc-400">›</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}
