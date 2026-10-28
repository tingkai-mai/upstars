import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin, requireUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { VolunteerTabs } from "../volunteer-tabs";
import { listPairings, listUsersByRole } from "../queries";
import { NewPairingButton, PairingList } from "./pairings-manager";

export const metadata: Metadata = { title: "Pairings" };

export default function PairingsPage({ searchParams }: PageProps<"/volunteers/pairings">) {
    return (
        <Suspense fallback={<p className="text-zinc-600">Loading pairings…</p>}>
            <Pairings searchParams={searchParams} />
        </Suspense>
    );
}

/** Admins manage pairings; tutors can view them; students only have their own profile. */
async function Pairings({ searchParams }: Pick<PageProps<"/volunteers/pairings">, "searchParams">) {
    const viewer = await requireUser();
    if (viewer.role === "student") redirect(`/volunteers/${viewer.id}`);
    const admin = isAdmin(viewer);

    const [{ q }, pairings, tutors, students] = await Promise.all([searchParams, listPairings(), admin ? listUsersByRole("tutor") : [], admin ? listUsersByRole("student") : []]);
    const initialQuery = typeof q === "string" ? q : "";
    // A student has at most one tutor, so only offer those without one
    const pairedStudentIds = new Set(pairings.map((p) => p.student.id));
    const unpairedStudents = students.filter((s) => !pairedStudentIds.has(s.id));

    return (
        <>
            <PageHeader title="Volunteer management" back={{ href: "/", label: "Home" }} />
            <VolunteerTabs active="pairings" action={admin && <NewPairingButton tutors={tutors} students={unpairedStudents} />} />
            {/* Keyed so a new ?q= link resets the filter, even if this page was kept alive */}
            <PairingList key={initialQuery} pairings={pairings} initialQuery={initialQuery} canEdit={admin} />
        </>
    );
}
