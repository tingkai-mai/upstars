import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { syllabus } from "@/db/schema";

export default async function Page() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/login");
    const rows = await db.select().from(syllabus);
    return <pre>{JSON.stringify(rows, null, 2)}</pre>;
}