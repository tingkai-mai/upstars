import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AdminOnly } from "../admin-only";
import { UserForm } from "../user-form";
import { createUser } from "../actions";

export const metadata: Metadata = { title: "Add user" };

export default function NewUserPage() {
    return (
        <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
            <NewUser />
        </Suspense>
    );
}

async function NewUser() {
    if (!(await getAdminUser())) return <AdminOnly />;

    return (
        <>
            <PageHeader title="Add user" back={{ href: "/volunteers", label: "Users" }} />
            <UserForm action={createUser} defaults={{ name: "", email: "", role: "student", currentLevel: "" }} mode="create" />
        </>
    );
}
