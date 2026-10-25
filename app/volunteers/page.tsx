import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AdminOnly } from "./admin-only";
import { RoleBadge } from "./role-badge";
import { VolunteerTabs } from "./volunteer-tabs";

export const metadata: Metadata = { title: "Volunteer management" };

export default function VolunteersPage() {
    return (
        <Suspense fallback={<p className="text-zinc-500">Loading users…</p>}>
            <UserList />
        </Suspense>
    );
}

async function UserList() {
    const admin = await getAdminUser();
    if (!admin) return <AdminOnly />;

    const users = await db
        .select({ id: user.id, name: user.name, email: user.email, role: user.role })
        .from(user)
        .orderBy(asc(user.name));

    return (
        <>
            <PageHeader title="Volunteer management" back={{ href: "/", label: "Home" }} />
            <VolunteerTabs active="users" />

            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {users.length} {users.length === 1 ? "user" : "users"}
                </p>
                <Link
                    href="/volunteers/new"
                    className="inline-flex h-10 shrink-0 items-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    Add user
                </Link>
            </div>

            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {users.map((member) => (
                    <li key={member.id}>
                        <Link
                            href={`/volunteers/${member.id}`}
                            className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                    {member.name}
                                    {member.id === admin.id && <span className="font-normal text-zinc-500"> (you)</span>}
                                </p>
                                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{member.email}</p>
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
