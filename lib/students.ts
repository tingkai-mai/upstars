import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pairing, user } from "@/db/schema";

type Viewer = { id: string; role?: string | null };
export type StudentOption = { id: string; name: string; email: string };

const studentColumns = { id: user.id, name: user.name, email: user.email };

/** The students whose progress this person can see: admins all, tutors their paired students, students themselves. */
export async function listViewableStudents(viewer: Viewer): Promise<StudentOption[]> {
    if (viewer.role === "admin") return db.select(studentColumns).from(user).where(eq(user.role, "student")).orderBy(asc(user.name));
    if (viewer.role === "tutor") {
        return db
            .select(studentColumns)
            .from(pairing)
            .innerJoin(user, eq(pairing.studentId, user.id))
            .where(and(eq(pairing.tutorId, viewer.id), eq(user.role, "student")))
            .orderBy(asc(user.name));
    }
    return db.select(studentColumns).from(user).where(and(eq(user.id, viewer.id), eq(user.role, "student")));
}

/** Whether this person may record goals and completion for the student: admins, or a tutor paired with them. */
export async function canEditStudent(viewer: Viewer, studentId: string) {
    const [student] = await db.select({ role: user.role }).from(user).where(eq(user.id, studentId));
    if (student?.role !== "student") return false;
    if (viewer.role === "admin") return true;
    if (viewer.role !== "tutor") return false;
    const [paired] = await db
        .select({ tutorId: pairing.tutorId })
        .from(pairing)
        .where(and(eq(pairing.tutorId, viewer.id), eq(pairing.studentId, studentId)));
    return Boolean(paired);
}

/** Whether this person may check in a lesson with the student: any tutor or admin, paired or not. */
export async function canCheckIn(viewer: Viewer, studentId: string) {
    if (viewer.role !== "admin" && viewer.role !== "tutor") return false;
    const [student] = await db.select({ role: user.role }).from(user).where(eq(user.id, studentId));
    return student?.role === "student";
}
