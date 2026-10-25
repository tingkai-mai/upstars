import { TEST_TYPE_LABELS } from "@/lib/tests";
import { getSubjectPlan, listTests, listWorksheets } from "@/app/syllabus/queries";
import { resolveSelection } from "@/app/syllabus/selection";
import { SyllabusFilter } from "@/app/syllabus/syllabus-filter";
import { EmptyState, formatWeeks } from "@/app/syllabus/ui";
import { listPairedPeople, listUsersByRole, type Person } from "@/app/volunteers/queries";
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
    const students = [...allStudents.filter((s) => pairedIds.has(s.id)), ...allStudents.filter((s) => !pairedIds.has(s.id))];
    const student = students.find((s) => s.id === params.student) ?? students[0];

    return (
        <section aria-labelledby="check-in-heading" className="flex flex-col gap-4 rounded-3xl border-2 border-zinc-900 p-4 sm:p-6 dark:border-zinc-50">
            <div>
                <h2 id="check-in-heading" className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                    Lesson Check-In
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Record what you covered with a student.</p>
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

type ContentProps = { students: Person[]; student: Person };

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
            {picker}
            <SyllabusFilter subjects={selection.subjects} levels={selection.levels} level={selection.level} subjectId={subject.id} />
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
