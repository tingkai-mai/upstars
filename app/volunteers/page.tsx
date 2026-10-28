import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { compactPrimaryButtonClass } from "@/components/form";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { isAdmin, requireUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Toast } from "@/components/toast";
import { UserList } from "./user-list";
import { VolunteerTabs } from "./volunteer-tabs";

export const metadata: Metadata = { title: "Volunteer management" };

const NOTICES: Record<string, string> = { "admin-profile": "Admin has no profile" };

type Props = PageProps<"/volunteers">;

export default function VolunteersPage({ searchParams }: Props) {
    return (
        <Suspense fallback={<p className="text-zinc-600">Loading users…</p>}>
            <Users searchParams={searchParams} />
        </Suspense>
    );
}

/** Admins manage everyone; tutors can browse everyone's profiles; students only have their own. */
async function Users({ searchParams }: Pick<Props, "searchParams">) {
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
            <PageHeader
                title="Volunteer management"
                back={{ href: "/", label: "Home" }}
                action={
                    admin && (
                        <Link href="/volunteers/new" className={compactPrimaryButtonClass}>
                            Add user
                        </Link>
                    )
                }
            />
            <VolunteerTabs active="users" />
            {noticeMessage && <Toast message={noticeMessage} />}
            <UserList users={users} viewerId={viewer.id} admin={admin} />
        </>
    );
}
