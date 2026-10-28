import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin, requireUser } from "@/lib/session";
import { pluralize } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { secondaryButtonClass } from "@/components/form";
import { EmptyState } from "@/app/syllabus/ui";
import { listStudentGoals } from "@/app/goals/queries";
import { GoalStatus, Marks } from "@/app/goals/goal-result";
import { formatLessonDate } from "@/app/check-in/dates";
import { listLessonPartners, listPastCheckIns, type LessonPartner } from "@/app/check-in/queries";
import { PastCheckInsCarousel } from "@/app/check-in/past-check-ins-carousel";
import { NoAccess } from "../admin-only";
import { RoleBadge } from "../role-badge";
import { getUser, listPairedPeople } from "../queries";

export const metadata: Metadata = { title: "User profile" };

type Props = PageProps<"/volunteers/[id]">;

export default function UserProfilePage({ params }: Props) {
    return (
        <Suspense fallback={<p className="text-zinc-600">Loading…</p>}>
            <UserProfile params={params} />
        </Suspense>
    );
}

/** Who's looking, and what they may do from this profile. */
type Access = { viewerId: string; admin: boolean; canOpenProfiles: boolean };

/** Admins and tutors can view every profile; students only their own. Admins have no profile. */
async function UserProfile({ params }: Pick<Props, "params">) {
    const viewer = await requireUser();
    const { id } = await params;
    if (viewer.role === "student" && id !== viewer.id) {
        return <NoAccess title="Not your profile" message="Students can only view their own profile." href={`/volunteers/${viewer.id}`} linkLabel="Go to your profile" />;
    }

    const member = await getUser(id);
    if (!member) notFound();
    if (member.role === "admin") redirect("/volunteers?notice=admin-profile");

    const access: Access = { viewerId: viewer.id, admin: isAdmin(viewer), canOpenProfiles: viewer.role !== "student" };

    return (
        <>
            <PageHeader
                title={member.name}
                back={access.canOpenProfiles ? { href: "/volunteers", label: "Users" } : { href: "/", label: "Home" }}
                action={
                    access.admin && (
                        <Link
                            href={`/volunteers/${id}/edit`}
                            className={secondaryButtonClass}
                        >
                            Edit
                        </Link>
                    )
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
                    {id === viewer.id && <span className="ml-2 text-sm text-zinc-600">(you)</span>}
                </Detail>
                <Detail label="Level">{member.currentLevel ? <span className="text-zinc-900 dark:text-zinc-50">{member.currentLevel}</span> : <span className="text-zinc-400">Not set</span>}</Detail>
            </dl>

            {member.role === "student" ? <StudentProfile student={member} access={access} /> : <TutorProfile tutor={member} access={access} />}
        </>
    );
}

type Member = { id: string; name: string; email: string };

async function StudentProfile({ student, access }: { student: Member; access: Access }) {
    const [[mainTutor], partners, goals, checkIns] = await Promise.all([
        listPairedPeople(student.id, "student"),
        listLessonPartners(student.id, "student"),
        listStudentGoals(student.id),
        listPastCheckIns(student.id),
    ]);
    const pastTutors = partners.filter((p) => p.id !== mainTutor?.id);

    return (
        <>
            <ProfileSection title="Main tutor" action={access.admin && <ManagePairingsLink email={student.email} />}>
                {mainTutor ? (
                    <PersonList people={[{ ...mainTutor, role: "tutor", detail: mainTutor.email }]} access={access} />
                ) : (
                    <EmptyState>No main tutor assigned yet.</EmptyState>
                )}
            </ProfileSection>

            <ProfileSection title="Also taught by" count={pastTutors.length}>
                {pastTutors.length ? (
                    <PersonList people={pastTutors.map(withLessonDetail)} access={access} />
                ) : (
                    <EmptyState>No one else has checked in a lesson with {student.name} yet.</EmptyState>
                )}
            </ProfileSection>

            <ProfileSection
                title="Goals"
                count={goals.length}
                action={
                    <Link
                        href={`/goals?student=${student.id}`}
                        className={secondaryButtonClass}
                    >
                        View progress
                    </Link>
                }
            >
                {goals.length ? <GoalResults goals={goals} /> : <EmptyState>No goals set yet.</EmptyState>}
            </ProfileSection>

            <ProfileSection title="Past sessions" count={checkIns.length}>
                {checkIns.length ? <PastCheckInsCarousel checkIns={checkIns} /> : <EmptyState>No lessons checked in yet.</EmptyState>}
            </ProfileSection>
        </>
    );
}

async function TutorProfile({ tutor, access }: { tutor: Member; access: Access }) {
    const [tutees, partners] = await Promise.all([listPairedPeople(tutor.id, "tutor"), listLessonPartners(tutor.id, "tutor")]);
    const tuteeIds = new Set(tutees.map((t) => t.id));
    const pastTutees = partners.filter((p) => !tuteeIds.has(p.id));

    return (
        <>
            <ProfileSection title={tutees.length > 1 ? "Main tutees" : "Main tutee"} action={access.admin && <ManagePairingsLink email={tutor.email} />}>
                {tutees.length ? (
                    <PersonList people={tutees.map((t) => ({ ...t, role: "student", detail: t.email }))} access={access} />
                ) : (
                    <EmptyState>No main tutee assigned yet.</EmptyState>
                )}
            </ProfileSection>

            <ProfileSection title="Also tutored" count={pastTutees.length}>
                {pastTutees.length ? <PersonList people={pastTutees.map(withLessonDetail)} access={access} /> : <EmptyState>{tutor.name} hasn&apos;t checked in lessons with anyone else yet.</EmptyState>}
            </ProfileSection>
        </>
    );
}

/** "Admin · 3 lessons · last 25 Oct 2026" */
function withLessonDetail(partner: LessonPartner): ListedPerson {
    const parts = [pluralize(partner.lessons, "lesson"), partner.lastLessonDate && `last ${formatLessonDate(partner.lastLessonDate)}`];
    if (partner.role === "admin") parts.unshift("Admin");
    return { ...partner, detail: parts.filter(Boolean).join(" · ") };
}

function ProfileSection({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {title} {count !== undefined && <span className="font-normal text-zinc-600 dark:text-zinc-400">({count})</span>}
                </h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function ManagePairingsLink({ email }: { email: string }) {
    return (
        <Link href={`/volunteers/pairings?q=${encodeURIComponent(email)}`} className="text-base font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
            Manage pairings
        </Link>
    );
}

type ListedPerson = { id: string; name: string; role: string; detail: string };

/** Links to each person's profile when the viewer may open it; admins have no profile, so never link. */
function PersonList({ people, access }: { people: ListedPerson[]; access: Access }) {
    return (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {people.map((person) => {
                const content = (
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-medium text-zinc-900 dark:text-zinc-50">
                            {person.name}
                            {person.id === access.viewerId && <span className="font-normal text-zinc-600"> (you)</span>}
                        </p>
                        <p className="truncate text-base text-zinc-600 dark:text-zinc-400">{person.detail}</p>
                    </div>
                );
                return (
                    <li key={person.id}>
                        {access.canOpenProfiles && person.role !== "admin" ? (
                            <Link
                                href={`/volunteers/${person.id}`}
                                className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
                            >
                                {content}
                                <span aria-hidden className="text-zinc-400">
                                    ›
                                </span>
                            </Link>
                        ) : (
                            <div className="flex min-h-16 items-center gap-3 px-4 py-3">{content}</div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

type GoalResult = Awaited<ReturnType<typeof listStudentGoals>>[number];

function GoalResults({ goals }: { goals: GoalResult[] }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full border-collapse text-left text-base">
                <thead className="bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                        <th scope="col" className="px-3 py-2 font-medium">
                            Goal
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                            Target
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                            Actual
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {goals.map((g) => (
                        <tr key={g.id} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                            <th scope="row" className="px-3 py-3 font-normal">
                                <span className="block font-semibold text-zinc-900 dark:text-zinc-50">
                                    Q{g.quarter} {g.year}
                                </span>
                                <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                                    {g.level} {g.subject}
                                </span>
                            </th>
                            <td className="px-3 py-3">
                                <Marks marks={g.targetMarks} total={g.totalMarks} />
                            </td>
                            <td className="px-3 py-3">
                                {g.actualMarks === null ? <span className="block text-zinc-400">—</span> : <Marks marks={g.actualMarks} total={g.totalMarks} />}
                                <GoalStatus goal={g} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <dt className="text-base text-zinc-600 sm:w-24 dark:text-zinc-400">{label}</dt>
            <dd className="flex items-center">{children}</dd>
        </div>
    );
}
