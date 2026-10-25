import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AdminOnly } from "../admin-only";
import { VolunteerTabs } from "../volunteer-tabs";
import { listPairings, listUsersByRole } from "../queries";
import { AddPairingForm, PairingList } from "./pairings-manager";

export const metadata: Metadata = { title: "Pairings" };

export default function PairingsPage({ searchParams }: PageProps<"/volunteers/pairings">) {
    return (
        <Suspense fallback={<p className="text-zinc-500">Loading pairings…</p>}>
            <Pairings searchParams={searchParams} />
        </Suspense>
    );
}

async function Pairings({ searchParams }: Pick<PageProps<"/volunteers/pairings">, "searchParams">) {
    if (!(await getAdminUser())) return <AdminOnly />;

    const [{ q }, pairings, tutors, students] = await Promise.all([searchParams, listPairings(), listUsersByRole("tutor"), listUsersByRole("student")]);
    const initialQuery = typeof q === "string" ? q : "";

    return (
        <>
            <PageHeader title="Volunteer management" back={{ href: "/", label: "Home" }} />
            <VolunteerTabs active="pairings" />
            <AddPairingForm tutors={tutors} students={students} />
            {/* Keyed so a new ?q= link resets the filter, even if this page was kept alive */}
            <PairingList key={initialQuery} pairings={pairings} initialQuery={initialQuery} />
        </>
    );
}
