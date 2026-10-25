import { requireUser } from "@/lib/session";
import { canEditStudent, listViewableStudents } from "@/lib/students";
import { getSubjectPlan, listTests, listWorksheets } from "@/app/syllabus/queries";
import { resolveSelection } from "@/app/syllabus/selection";
import { getCompletion } from "./queries";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Everything the goal tracking tabs share: who's viewing, which student and subject are selected,
 * the subject's syllabus, and what the student has completed.
 */
export async function loadProgress(params: SearchParams) {
    const viewer = await requireUser();
    const [students, selection] = await Promise.all([listViewableStudents(viewer), resolveSelection(params)]);
    const student = students.find((s) => s.id === params.student) ?? students[0];
    const subject = selection.subject;
    if (!student || !subject) return { viewer, students, student, selection, data: null };

    const [plan, worksheets, tests, completion, canEdit] = await Promise.all([
        getSubjectPlan(subject.id),
        listWorksheets(subject.id),
        listTests(subject.id),
        getCompletion(student.id, subject.id),
        canEditStudent(viewer, student.id),
    ]);
    if (!plan) return { viewer, students, student, selection, data: null };
    return { viewer, students, student, selection, data: { plan, worksheets, tests, completion, canEdit } };
}

export type Progress = Awaited<ReturnType<typeof loadProgress>>;
export type ProgressData = NonNullable<Progress["data"]>;
