"use server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conceptCompletion, goal, testCompletion, worksheetCompletion } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canEditStudent } from "@/lib/students";
import { assertFound, optionalWholeNumber, runMutation, wholeNumber, type FormResult } from "@/lib/form-data";

const NOT_ALLOWED: FormResult = { error: "Only admins and this student's tutors can update their progress." };

/** Runs a change to a student's progress if the signed-in user may edit that student. */
async function asStudentEditor(studentId: string, work: (recordedBy: string) => Promise<unknown>, duplicateMessage?: string): Promise<FormResult> {
    const session = await getSession();
    if (!session || !(await canEditStudent(session.user, studentId))) return NOT_ALLOWED;
    return runMutation(() => work(session.user.id), duplicateMessage);
}

// Completion

export type CompletionKind = "concept" | "worksheet" | "test";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A missing item fails the foreign key, which runMutation reports as "This item no longer exists"
function markDone(kind: CompletionKind, studentId: string, itemId: string, recordedBy: string) {
    if (kind === "concept") return db.insert(conceptCompletion).values({ studentId, conceptId: itemId, recordedBy }).onConflictDoNothing();
    if (kind === "worksheet") return db.insert(worksheetCompletion).values({ studentId, worksheetId: itemId, recordedBy }).onConflictDoNothing();
    return db.insert(testCompletion).values({ studentId, testId: itemId, recordedBy }).onConflictDoNothing();
}

function markNotDone(kind: CompletionKind, studentId: string, itemId: string) {
    if (kind === "concept") return db.delete(conceptCompletion).where(and(eq(conceptCompletion.studentId, studentId), eq(conceptCompletion.conceptId, itemId)));
    if (kind === "worksheet") return db.delete(worksheetCompletion).where(and(eq(worksheetCompletion.studentId, studentId), eq(worksheetCompletion.worksheetId, itemId)));
    return db.delete(testCompletion).where(and(eq(testCompletion.studentId, studentId), eq(testCompletion.testId, itemId)));
}

/** Marks one concept, worksheet or test as done (or not done) for a student. */
export async function setCompletion(kind: CompletionKind, studentId: string, itemId: string, done: boolean): Promise<FormResult> {
    if (!["concept", "worksheet", "test"].includes(kind) || !UUID.test(itemId)) return { error: "Unknown item. Refresh and try again." };
    return asStudentEditor(studentId, (recordedBy) => (done ? markDone(kind, studentId, itemId, recordedBy) : markNotDone(kind, studentId, itemId)));
}

/** Marks several concepts (e.g. a whole week) done or not done at once. */
export async function setConceptsCompletion(studentId: string, conceptIds: string[], done: boolean): Promise<FormResult> {
    const ids = [...new Set(conceptIds)];
    if (ids.length === 0 || ids.length > 200 || !ids.every((id) => UUID.test(id))) return { error: "Unknown items. Refresh and try again." };
    return asStudentEditor(studentId, (recordedBy) =>
        done
            ? db
                  .insert(conceptCompletion)
                  .values(ids.map((conceptId) => ({ studentId, conceptId, recordedBy })))
                  .onConflictDoNothing()
            : db.delete(conceptCompletion).where(and(eq(conceptCompletion.studentId, studentId), inArray(conceptCompletion.conceptId, ids))),
    );
}

// Goals

const DUPLICATE_GOAL = "This student already has a goal for that quarter. Edit it instead.";

function readGoal(formData: FormData) {
    const month = wholeNumber(formData, "month", "Month", { min: 1, max: 12 });
    const year = wholeNumber(formData, "year", "Year", { min: 2000, max: 2100 });
    const totalMarks = wholeNumber(formData, "totalMarks", "Total marks", { min: 1, max: 1_000 });
    const targetMarks = wholeNumber(formData, "targetMarks", "Target marks", { max: totalMarks });
    const actualMarks = optionalWholeNumber(formData, "actualMarks", "Actual marks", { max: totalMarks });
    return { month, year, totalMarks, targetMarks, actualMarks };
}

export async function createGoal(studentId: string, subjectId: string, formData: FormData) {
    return asStudentEditor(studentId, () => db.insert(goal).values({ studentId, subjectId, ...readGoal(formData) }), DUPLICATE_GOAL);
}

/** Looks up whose goal this is, so permissions are checked against the goal's actual student. */
async function goalStudent(id: string) {
    const [found] = await db.select({ studentId: goal.studentId }).from(goal).where(eq(goal.id, id));
    return found?.studentId;
}

export async function updateGoal(id: string, formData: FormData): Promise<FormResult> {
    const studentId = await goalStudent(id);
    if (!studentId) return { error: "This goal no longer exists. Refresh and try again." };
    return asStudentEditor(
        studentId,
        async () => assertFound(await db.update(goal).set(readGoal(formData)).where(eq(goal.id, id)).returning({ id: goal.id })),
        DUPLICATE_GOAL,
    );
}

export async function deleteGoal(id: string): Promise<FormResult> {
    const studentId = await goalStudent(id);
    if (!studentId) return { error: "This goal no longer exists. Refresh and try again." };
    return asStudentEditor(studentId, () => db.delete(goal).where(eq(goal.id, id)));
}

export type { FormResult };
