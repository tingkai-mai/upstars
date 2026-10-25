import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { pairing, user } from "@/db/schema";
import type { UserRole } from "@/lib/users";

const tutor = alias(user, "tutor");
const student = alias(user, "student");

export type Person = { id: string; name: string; email: string };
export type Pairing = { tutor: Person; student: Person };

export async function listPairings(): Promise<Pairing[]> {
    return db
        .select({
            tutor: { id: tutor.id, name: tutor.name, email: tutor.email },
            student: { id: student.id, name: student.name, email: student.email },
        })
        .from(pairing)
        .innerJoin(tutor, eq(pairing.tutorId, tutor.id))
        .innerJoin(student, eq(pairing.studentId, student.id))
        .orderBy(asc(tutor.name), asc(student.name));
}

export async function listUsersByRole(role: UserRole): Promise<Person[]> {
    return db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.role, role)).orderBy(asc(user.name));
}

/** The people paired with a user: a tutor's students, or a student's tutors. Admins have none. */
export async function listPairedPeople(userId: string, role: UserRole): Promise<Person[]> {
    if (role === "admin") return [];
    const [self, other] = role === "tutor" ? [pairing.tutorId, pairing.studentId] : [pairing.studentId, pairing.tutorId];
    return db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(pairing)
        .innerJoin(user, eq(other, user.id))
        .where(eq(self, userId))
        .orderBy(asc(user.name));
}

export async function getUser(userId: string) {
    const [found] = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user).where(eq(user.id, userId));
    return found;
}
