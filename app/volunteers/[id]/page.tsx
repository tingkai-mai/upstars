import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin, requireUser } from "@/lib/session";
import { pluralize } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { secondaryButtonClass } from "@/components/form";
import { ChevronRightIcon, MailIcon, PenIcon } from "@/components/icons";
import { EmptyState } from "@/app/syllabus/ui";
import { listStudentGoals } from "@/app/goals/queries";
import { GoalStatus } from "@/app/goals/goal-result";
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

    const isSelf = id === viewer.id;
    const access: Access = { viewerId: viewer.id, admin: isAdmin(viewer), canOpenProfiles: viewer.role !== "student" };

    return (
        <>
            <PageHeader
                title={isSelf ? "My profile" : member.name}
                subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                        {isSelf && <span className="font-medium text-zinc-900 dark:text-zinc-50">{member.name}</span>}
                        <RoleBadge role={member.role} />
                        {member.currentLevel ?? "Level not set"}
                    </span>
                }
                back={access.canOpenProfiles ? { href: "/volunteers", label: "Users" } : { href: "/", label: "Home" }}
                action={
                    access.admin && (
                        <Link href={`/volunteers/${id}/edit`} className={`${secondaryButtonClass} gap-2`}>
                            <PenIcon />
                            Edit details
                        </Link>
                    )
                }
            />

            <a
                href={`mailto:${member.email}`}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-base text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
                <MailIcon />
                <span className="min-w-0 flex-1 break-all">{member.email}</span>
            </a>

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
            <ProfileSection title="Main tutor" action={access.admin && <ManagePairingsLink email={student.email} label="Change tutor" />}>
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
            <ProfileSection title={tutees.length > 1 ? "Main tutees" : "Main tutee"} action={access.admin && <ManagePairingsLink email={tutor.email} label="Change students" />}>
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

function ManagePairingsLink({ email, label }: { email: string; label: string }) {
    return (
        <Link href={`/volunteers/pairings?q=${encodeURIComponent(email)}`} className={secondaryButtonClass}>
            {label}
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
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    <ChevronRightIcon />
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
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {goals.map((g) => (
                <li key={g.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <p>
                            <span className="block text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                                Q{g.quarter} {g.year}
                            </span>
                            <span className="block text-base text-zinc-600 dark:text-zinc-400">
                                {g.level} {g.subject}
                            </span>
                        </p>
                        <GoalStatus goal={g} />
                    </div>
                    <p className="text-base text-zinc-800 dark:text-zinc-200">
                        Target <span className="font-semibold tabular-nums">{g.targetMarks}/{g.totalMarks}</span>
                        {" · "}Result <span className="font-semibold tabular-nums">{g.actualMarks === null ? "not yet" : `${g.actualMarks}/${g.totalMarks}`}</span>
                    </p>
                </li>
            ))}
        </ul>
    );
}
