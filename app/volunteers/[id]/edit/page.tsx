import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AdminOnly } from "../../admin-only";
import { UserForm } from "../../user-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteUser, updateUser } from "../../actions";
import { getUser } from "../../queries";

export const metadata: Metadata = { title: "Edit user" };

type Props = PageProps<"/volunteers/[id]/edit">;

export default function EditUserPage({ params }: Props) {
    return (
        <Suspense fallback={<p className="text-zinc-600">Loading…</p>}>
            <EditUser params={params} />
        </Suspense>
    );
}

async function EditUser({ params }: Pick<Props, "params">) {
    const admin = await getAdminUser();
    if (!admin) return <AdminOnly />;

    const { id } = await params;
    const member = await getUser(id);
    if (!member) notFound();

    const isSelf = id === admin.id;

    return (
        <>
            <PageHeader title="Edit user" back={member.role === "admin" ? { href: "/volunteers", label: "Users" } : { href: `/volunteers/${id}`, label: member.name }} />
            <UserForm action={updateUser.bind(null, id)} defaults={member} mode="edit" roleLocked={isSelf} />
            {!isSelf && (
                <section className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Delete this user</h2>
                    <p className="text-base text-zinc-600 dark:text-zinc-400">Removes their account and pairings. This can&apos;t be undone.</p>
                    <DeleteButton action={deleteUser.bind(null, id)} label="Delete user" confirm={`Delete ${member.name}? Their pairings will be removed too. This can't be undone.`} />
                </section>
            )}
        </>
    );
}
