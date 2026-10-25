import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { db } from "@/db";
import { syllabus } from "@/db/schema";
import { SignOutButton } from "@/components/sign-out-button";

export default function Page() {
    return (
        <Suspense fallback={<p className="p-6 text-zinc-500">Loading…</p>}>
            <Syllabus />
        </Suspense>
    );
}

async function Syllabus() {
    const user = await requireUser();
    const rows = await db.select().from(syllabus);
    return (
        <main className="flex flex-col gap-4 p-6">
            <header className="flex items-center justify-between gap-4">
                <p className="truncate text-sm text-zinc-500">Signed in as {user.email}</p>
                <SignOutButton />
            </header>
            <pre className="overflow-x-auto text-sm">{JSON.stringify(rows, null, 2)}</pre>
        </main>
    );
}
