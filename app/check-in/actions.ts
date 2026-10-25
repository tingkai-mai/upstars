"use server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { checkIn, checkInConcept, checkInTest, checkInWorksheet, concept, conceptCompletion, test, testCompletion, week, worksheet, worksheetCompletion } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canCheckIn } from "@/lib/students";
import { InvalidInput, runMutation, text, type FormResult } from "@/lib/form-data";
import { MAX_REMARKS_LENGTH, todayInSingapore } from "./dates";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Reads the ids ticked under `key`, deduplicated; non-UUIDs (tampered input) are rejected. */
function checkedIds(formData: FormData, key: string) {
    const ids = [...new Set(formData.getAll(key).map(String))];
    if (!ids.every((id) => UUID.test(id))) throw new InvalidInput("Invalid selection. Refresh and try again.");
    return ids;
}

function assertAllFound(found: unknown[], ids: string[], what: string) {
    if (found.length !== ids.length) throw new InvalidInput(`Some ${what} are no longer in this subject. Refresh and try again.`);
}

function readLessonDate(formData: FormData) {
    const value = String(formData.get("lessonDate") ?? "");
    const parsed = new Date(`${value}T00:00:00Z`);
    // The round trip rejects dates JavaScript rolls over, such as 2026-02-30
    const valid = ISO_DATE.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
    if (!valid) throw new InvalidInput("Choose the lesson date.");
    if (value > todayInSingapore()) throw new InvalidInput("The lesson date can't be in the future.");
    return value;
}

/** Reads the check-in form, checking that every ticked item belongs to the subject. */
async function readCheckIn(tx: Transaction, subjectId: string, formData: FormData) {
    const lessonDate = readLessonDate(formData);
    const remarks = text(formData, "remarks", "Remarks");
    if (remarks.length > MAX_REMARKS_LENGTH) throw new InvalidInput(`Remarks can be at most ${MAX_REMARKS_LENGTH} characters.`);
    const conceptIds = checkedIds(formData, "conceptId");
    const worksheetIds = checkedIds(formData, "worksheetId");
    const testIds = checkedIds(formData, "testId");

    const [concepts, worksheets, tests] = await Promise.all([
        conceptIds.length
            ? tx.select({ id: concept.id }).from(concept).innerJoin(week, eq(concept.weekId, week.id)).where(and(eq(week.subjectId, subjectId), inArray(concept.id, conceptIds)))
            : [],
        worksheetIds.length ? tx.select({ id: worksheet.id }).from(worksheet).where(and(eq(worksheet.subjectId, subjectId), inArray(worksheet.id, worksheetIds))) : [],
        testIds.length ? tx.select({ id: test.id }).from(test).where(and(eq(test.subjectId, subjectId), inArray(test.id, testIds))) : [],
    ]);
    assertAllFound(concepts, conceptIds, "concepts");
    assertAllFound(worksheets, worksheetIds, "worksheets");
    assertAllFound(tests, testIds, "tests");
    return { lessonDate, remarks, conceptIds, worksheetIds, testIds };
}

/** Records a lesson with a student and marks what was covered as done in goal tracking. Any tutor or admin may. */
export async function createCheckIn(studentId: string, subjectId: string, formData: FormData): Promise<FormResult> {
    const session = await getSession();
    if (!session || !(await canCheckIn(session.user, studentId))) return { error: "Only tutors and admins can check in lessons." };
    const recordedBy = session.user.id;

    return runMutation(() =>
        db.transaction(async (tx) => {
            const { conceptIds, worksheetIds, testIds, ...values } = await readCheckIn(tx, subjectId, formData);
            const [created] = await tx.insert(checkIn).values({ studentId, subjectId, recordedBy, ...values }).returning({ id: checkIn.id });
            const checkInId = created.id;

            // Completion is kept from the first time an item was done, so re-covering it changes nothing there
            if (conceptIds.length) {
                await tx.insert(checkInConcept).values(conceptIds.map((conceptId) => ({ checkInId, conceptId })));
                await tx.insert(conceptCompletion).values(conceptIds.map((conceptId) => ({ studentId, conceptId, recordedBy }))).onConflictDoNothing();
            }
            if (worksheetIds.length) {
                await tx.insert(checkInWorksheet).values(worksheetIds.map((worksheetId) => ({ checkInId, worksheetId })));
                await tx.insert(worksheetCompletion).values(worksheetIds.map((worksheetId) => ({ studentId, worksheetId, recordedBy }))).onConflictDoNothing();
            }
            if (testIds.length) {
                await tx.insert(checkInTest).values(testIds.map((testId) => ({ checkInId, testId })));
                await tx.insert(testCompletion).values(testIds.map((testId) => ({ studentId, testId, recordedBy }))).onConflictDoNothing();
            }
        }),
    );
}
