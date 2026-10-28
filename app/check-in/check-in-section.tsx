import { TEST_TYPE_LABELS } from "@/lib/tests";
import { FilterPanel } from "@/components/filter-panel";
import { getSubjectPlan, listTests, listWorksheets } from "@/app/syllabus/queries";
import { resolveSelection } from "@/app/syllabus/selection";
import { SyllabusFilter } from "@/app/syllabus/syllabus-filter";
import { EmptyState, formatWeeks } from "@/app/syllabus/ui";
import { listPairedPeople, listUsersByRole } from "@/app/volunteers/queries";
import { getCompletion } from "@/app/goals/queries";
import { createCheckIn } from "./actions";
import { CheckInActions } from "./check-in-dialog";
import { CheckInForm } from "./check-in-form";
import { todayInSingapore } from "./dates";
import { listPastCheckIns } from "./queries";
import { PastCheckInsCarousel } from "./past-check-ins-carousel";
import { StudentPicker } from "./student-picker";

type SearchParams = Record<string, string | string[] | undefined>;
type Viewer = { id: string; role?: string | null };

/** The homepage's lesson check-in, for tutors and admins. Anyone may check in with any student. */
export async function CheckInSection({ viewer, params }: { viewer: Viewer; params: SearchParams }) {
    const [allStudents, paired] = await Promise.all([listUsersByRole("student"), viewer.role === "tutor" ? listPairedPeople(viewer.id, "tutor") : []]);
    // A tutor's own students come first, so the default is one of theirs
    const pairedIds = new Set(paired.map((s) => s.id));
    const students = [
        ...allStudents.filter((s) => pairedIds.has(s.id)).map((s) => ({ ...s, group: "Your students" })),
        ...allStudents.filter((s) => !pairedIds.has(s.id)).map((s) => ({ ...s, group: pairedIds.size ? "Other students" : undefined })),
    ];
    const student = students.find((s) => s.id === params.student) ?? students[0];

    return (
        <section aria-labelledby="check-in-heading" className="flex flex-col gap-4 rounded-3xl bg-zinc-100 p-4 sm:p-6 dark:bg-zinc-900">
            <div>
                <h2 id="check-in-heading" className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                    Lesson Check-In
                </h2>
                <p className="text-base text-zinc-600 dark:text-zinc-400">Record what you covered with a student.</p>
            </div>
            {!student ? (
                <EmptyState>No students yet. Add one in Volunteer management.</EmptyState>
            ) : (
                <CheckInActions
                    checkIn={<CheckInContent students={students} student={student} params={params} />}
                    pastCheckIns={<PastCheckIns students={students} student={student} />}
                />
            )}
        </section>
    );
}

type Student = Awaited<ReturnType<typeof listUsersByRole>>[number];
type ContentProps = { students: Student[]; student: Student };

/** The check-in modal's contents: student and subject (kept in the URL), then the check-in form. */
async function CheckInContent({ students, student, params }: ContentProps & { params: SearchParams }) {
    const selection = await resolveSelection(params);
    const subject = selection.subject;
    const picker = <StudentPicker students={students} studentId={student.id} />;
    if (!subject) {
        return (
            <>
                {picker}
                <EmptyState>No subjects yet. Add one in Syllabus management.</EmptyState>
            </>
        );
    }

    const [plan, worksheets, tests, completion] = await Promise.all([getSubjectPlan(subject.id), listWorksheets(subject.id), listTests(subject.id), getCompletion(student.id, subject.id)]);
    const chapterNames = new Map(plan?.chapters.map((c) => [c.id, c.name]));

    return (
        <>
            {/* Folded into one line, so the form starts near the top; tutors mostly check in their own student */}
            <details className="group/who rounded-2xl bg-zinc-100 dark:bg-zinc-900">
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">
                        <span className="block text-lg font-semibold text-zinc-900 dark:text-zinc-50">{student.name}</span>
                        <span className="block text-base text-zinc-700 dark:text-zinc-300">
                            {subject.level} {subject.name}
                        </span>
                    </span>
                    <span className="inline-flex h-11 shrink-0 items-center rounded-lg bg-white px-4 text-base font-medium text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-200">
                        <span className="group-open/who:hidden">Change</span>
                        <span className="hidden group-open/who:inline">Hide</span>
                    </span>
                </summary>
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <FilterPanel>
                        {picker}
                        <SyllabusFilter subjects={selection.subjects} levels={selection.levels} level={selection.level} subjectId={subject.id} />
                    </FilterPanel>
                </div>
            </details>
            <CheckInForm
                // Remount on a new selection, so ticks from one student or subject don't carry over
                key={`${student.id}-${subject.id}`}
                studentName={student.name}
                subjectName={`${subject.level} ${subject.name}`}
                chapters={plan?.chapters ?? []}
                doneConceptIds={[...completion.concepts.keys()]}
                worksheets={worksheets.map((w) => ({
                    id: w.id,
                    name: w.name,
                    detail: w.concepts.length ? formatWeeks(w.concepts.map((c) => c.weekNumber)) : undefined,
                    done: completion.worksheets.has(w.id),
                }))}
                tests={tests.map((t) => ({
                    id: t.id,
                    name: t.name,
                    detail: [TEST_TYPE_LABELS[t.type].one, ...t.chapterIds.flatMap((id) => chapterNames.get(id) ?? [])].join(" · "),
                    done: completion.tests.has(t.id),
                }))}
                today={todayInSingapore()}
                action={createCheckIn.bind(null, student.id, subject.id)}
            />
        </>
    );
}

/** The past check-ins modal's contents: the student's check-ins by whoever made them, one lesson at a time. */
async function PastCheckIns({ students, student }: ContentProps) {
    const checkIns = await listPastCheckIns(student.id);

    return (
        <>
            <StudentPicker students={students} studentId={student.id} />
            {checkIns.length === 0 ? (
                <EmptyState>No check-ins for {student.name} yet.</EmptyState>
            ) : (
                // Keyed so a new student starts back on their latest lesson
                <PastCheckInsCarousel key={student.id} checkIns={checkIns} />
            )}
        </>
    );
}
