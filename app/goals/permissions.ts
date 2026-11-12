import { getSession } from "@/lib/session";
import { canEditStudent } from "@/lib/students";
import { runMutation, type FormResult } from "@/lib/form-data";

const NOT_ALLOWED: FormResult = { error: "Only admins and this student's tutors can update their progress." };

/** Runs a change to a student's progress or syllabus if the signed-in user may edit that student. */
export async function asStudentEditor(studentId: string, work: (recordedBy: string) => Promise<unknown>, duplicateMessage?: string): Promise<FormResult> {
    const session = await getSession();
    if (!session || !(await canEditStudent(session.user, studentId))) return NOT_ALLOWED;
    return runMutation(() => work(session.user.id), duplicateMessage);
}
