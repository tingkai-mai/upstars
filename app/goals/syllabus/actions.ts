"use server";
import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { concept, studentSyllabus, studentWeek, studentWeekConcept, week } from "@/db/schema";
import { InvalidInput, text, wholeNumber, type FormResult } from "@/lib/form-data";
import { readOrder } from "@/lib/reorder";
import { asStudentEditor } from "../permissions";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type OwnedWeek = { id: string; studentId: string; subjectId: string };
type SyllabusWeek = Awaited<ReturnType<typeof lockSyllabus>>[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GONE = "This item no longer exists. Refresh and try again.";

function readDuration(formData: FormData) {
    return wholeNumber(formData, "durationMin", "Teaching time", { max: 1_440 });
}

/**
 * Locks the student's custom syllabus so changes to it run one at a time, and returns its weeks in order.
 * Throws if the student no longer has one (e.g. it was reset meanwhile).
 */
async function lockSyllabus(tx: Transaction, studentId: string, subjectId: string) {
    const [found] = await tx
        .select({ studentId: studentSyllabus.studentId })
        .from(studentSyllabus)
        .where(and(eq(studentSyllabus.studentId, studentId), eq(studentSyllabus.subjectId, subjectId)))
        .for("update");
    if (!found) throw new InvalidInput(GONE);
    return tx
        .select({ id: studentWeek.id, chapterId: studentWeek.chapterId, position: studentWeek.position })
        .from(studentWeek)
        .where(and(eq(studentWeek.studentId, studentId), eq(studentWeek.subjectId, subjectId)))
        .orderBy(asc(studentWeek.position), asc(studentWeek.createdAt));
}

/** Gives the weeks positions 1…n in the order of orderedIds, writing only those that changed. */
async function saveWeekOrder(tx: Transaction, weeks: { id: string; position: number }[], orderedIds: string[]) {
    const current = new Map(weeks.map((w) => [w.id, w.position]));
    for (const [index, id] of orderedIds.entries()) {
        if (current.get(id) !== index + 1) await tx.update(studentWeek).set({ position: index + 1 }).where(eq(studentWeek.id, id));
    }
}

/** Looks up whose week this is, then runs the change in a transaction if the signed-in user may edit that student. */
async function asWeekEditor(weekId: string, work: (tx: Transaction, owned: OwnedWeek, weeks: SyllabusWeek[]) => Promise<unknown>): Promise<FormResult> {
    if (!UUID.test(weekId)) return { error: GONE };
    const [owned] = await db.select({ id: studentWeek.id, studentId: studentWeek.studentId, subjectId: studentWeek.subjectId }).from(studentWeek).where(eq(studentWeek.id, weekId));
    if (!owned) return { error: GONE };
    return asStudentEditor(owned.studentId, () =>
        db.transaction(async (tx) => work(tx, owned, await lockSyllabus(tx, owned.studentId, owned.subjectId))),
    );
}

/** Appends a concept to the end of a custom week. */
function appendConcept(tx: Transaction, studentWeekId: string, conceptId: string) {
    return tx.insert(studentWeekConcept).values({
        studentWeekId,
        conceptId,
        position: sql`(SELECT COALESCE(MAX(${studentWeekConcept.position}), 0) + 1 FROM ${studentWeekConcept} WHERE ${studentWeekConcept.studentWeekId} = ${studentWeekId})`,
    });
}

// Whole syllabus

/** Gives the student their own copy of the standard syllabus. Done ticks and lessons are kept. The button then opens it for editing. */
export async function customiseSyllabus(studentId: string, subjectId: string): Promise<FormResult> {
    if (!UUID.test(subjectId)) return { error: GONE };
    return asStudentEditor(studentId, () =>
        db.transaction(async (tx) => {
            const [created] = await tx.insert(studentSyllabus).values({ studentId, subjectId }).onConflictDoNothing().returning({ studentId: studentSyllabus.studentId });
            if (!created) return; // Someone else customised it first; open theirs

            const [weeks, concepts] = await Promise.all([
                tx.select({ id: week.id, chapterId: week.chapterId, durationMin: week.durationMin }).from(week).where(eq(week.subjectId, subjectId)).orderBy(asc(week.number)),
                tx
                    .select({ id: concept.id, weekId: concept.weekId })
                    .from(concept)
                    .where(and(eq(concept.subjectId, subjectId), isNotNull(concept.weekId)))
                    .orderBy(asc(concept.position), asc(concept.createdAt)),
            ]);
            if (weeks.length === 0) return;

            // Ids are made here so each standard week maps to its copy without relying on insert order
            const copyId = new Map(weeks.map((w) => [w.id, randomUUID()]));
            await tx.insert(studentWeek).values(weeks.map((w, index) => ({ id: copyId.get(w.id), studentId, subjectId, chapterId: w.chapterId, position: index + 1, durationMin: w.durationMin })));
            const links = concepts.flatMap((c, index) => {
                const studentWeekId = c.weekId && copyId.get(c.weekId);
                // Concepts are already in week order, so their index keeps that order within each week
                return studentWeekId ? [{ studentWeekId, conceptId: c.id, position: index + 1 }] : [];
            });
            if (links.length) await tx.insert(studentWeekConcept).values(links);
        }),
    );
}

/** Puts the student back on the standard syllabus. Done ticks and past lessons are kept. */
export async function resetSyllabus(studentId: string, subjectId: string): Promise<FormResult> {
    if (!UUID.test(subjectId)) return { error: GONE };
    return asStudentEditor(studentId, () => db.delete(studentSyllabus).where(and(eq(studentSyllabus.studentId, studentId), eq(studentSyllabus.subjectId, subjectId))));
}

// Chapters

/** Saves the chapters in a new order, from a drag-and-drop; each chapter's weeks move with it. */
export async function reorderChapters(studentId: string, subjectId: string, orderedIds: string[]): Promise<FormResult> {
    if (!UUID.test(subjectId)) return { error: GONE };
    return asStudentEditor(studentId, () =>
        db.transaction(async (tx) => {
            const weeks = await lockSyllabus(tx, studentId, subjectId);
            const chapterOrder = readOrder(orderedIds, [...new Set(weeks.map((w) => w.chapterId))]);
            await saveWeekOrder(tx, weeks, chapterOrder.flatMap((id) => weeks.filter((w) => w.chapterId === id).map((w) => w.id)));
        }),
    );
}

/** Takes a chapter's weeks out of the student's syllabus. */
export async function removeChapter(studentId: string, subjectId: string, chapterId: string): Promise<FormResult> {
    if (!UUID.test(subjectId) || !UUID.test(chapterId)) return { error: GONE };
    return asStudentEditor(studentId, () =>
        db.transaction(async (tx) => {
            const weeks = await lockSyllabus(tx, studentId, subjectId);
            await tx.delete(studentWeek).where(and(eq(studentWeek.studentId, studentId), eq(studentWeek.subjectId, subjectId), eq(studentWeek.chapterId, chapterId)));
            const kept = weeks.filter((w) => w.chapterId !== chapterId);
            await saveWeekOrder(tx, kept, kept.map((w) => w.id));
        }),
    );
}

// Weeks

/** Adds a week after the chapter's last week, or at the end if the chapter has none in this syllabus. */
export async function addWeek(studentId: string, subjectId: string, chapterId: string, formData: FormData): Promise<FormResult> {
    if (!UUID.test(subjectId) || !UUID.test(chapterId)) return { error: GONE };
    return asStudentEditor(studentId, () =>
        db.transaction(async (tx) => {
            const durationMin = readDuration(formData);
            const weeks = await lockSyllabus(tx, studentId, subjectId);
            const id = randomUUID();
            const position = weeks.length + 1;
            // The composite foreign key rejects a chapter from another subject
            await tx.insert(studentWeek).values({ id, studentId, subjectId, chapterId, position, durationMin });
            const orderedIds = weeks.map((w) => w.id);
            const lastInChapter = weeks.findLastIndex((w) => w.chapterId === chapterId);
            orderedIds.splice(lastInChapter === -1 ? orderedIds.length : lastInChapter + 1, 0, id);
            await saveWeekOrder(tx, [...weeks, { id, position }], orderedIds);
        }),
    );
}

export async function updateWeek(weekId: string, formData: FormData): Promise<FormResult> {
    return asWeekEditor(weekId, async (tx) => {
        await tx.update(studentWeek).set({ durationMin: readDuration(formData) }).where(eq(studentWeek.id, weekId));
    });
}

/** Removes a week and its concepts from the syllabus, then renumbers the rest. */
export async function removeWeek(weekId: string): Promise<FormResult> {
    return asWeekEditor(weekId, async (tx, _owned, weeks) => {
        await tx.delete(studentWeek).where(eq(studentWeek.id, weekId));
        const kept = weeks.filter((w) => w.id !== weekId);
        await saveWeekOrder(tx, kept, kept.map((w) => w.id));
    });
}

/** Saves a chapter's weeks in a new order, from a drag-and-drop. Other chapters' weeks stay where they are. */
export async function reorderWeeks(studentId: string, subjectId: string, chapterId: string, orderedIds: string[]): Promise<FormResult> {
    if (!UUID.test(subjectId)) return { error: GONE };
    return asStudentEditor(studentId, () =>
        db.transaction(async (tx) => {
            const weeks = await lockSyllabus(tx, studentId, subjectId);
            // The places this chapter's weeks hold in the syllabus, refilled in the new order
            const slots = weeks.flatMap((w, index) => (w.chapterId === chapterId ? [index] : []));
            const chapterOrder = readOrder(orderedIds, slots.map((slot) => weeks[slot].id));
            const allIds = weeks.map((w) => w.id);
            slots.forEach((slot, index) => (allIds[slot] = chapterOrder[index]));
            await saveWeekOrder(tx, weeks, allIds);
        }),
    );
}

// Concepts

/** Adds a new concept, just for this student, to the end of a week. */
export async function addConcept(weekId: string, formData: FormData): Promise<FormResult> {
    return asWeekEditor(weekId, async (tx, owned) => {
        const name = text(formData, "name", "Concept");
        // position orders standard concepts within their week; this one's order is kept in studentWeekConcept
        const [created] = await tx.insert(concept).values({ subjectId: owned.subjectId, studentId: owned.studentId, name, position: 0 }).returning({ id: concept.id });
        await appendConcept(tx, weekId, created.id);
    });
}

/** Whether the concept is already somewhere in this student's syllabus. */
async function isInSyllabus(tx: Transaction, owned: OwnedWeek, conceptId: string) {
    const [found] = await tx
        .select({ id: studentWeekConcept.conceptId })
        .from(studentWeekConcept)
        .innerJoin(studentWeek, eq(studentWeekConcept.studentWeekId, studentWeek.id))
        .where(and(eq(studentWeek.studentId, owned.studentId), eq(studentWeek.subjectId, owned.subjectId), eq(studentWeekConcept.conceptId, conceptId)));
    return Boolean(found);
}

/** Adds a standard concept (or one made earlier for this student) that isn't in their syllabus to the end of a week. */
export async function addBackConcept(weekId: string, formData: FormData): Promise<FormResult> {
    return asWeekEditor(weekId, async (tx, owned) => {
        const conceptId = String(formData.get("conceptId") ?? "");
        if (!UUID.test(conceptId)) throw new InvalidInput("Choose a concept.");
        const [found] = await tx.select({ subjectId: concept.subjectId, studentId: concept.studentId }).from(concept).where(eq(concept.id, conceptId));
        const usable = found && found.subjectId === owned.subjectId && (found.studentId === null || found.studentId === owned.studentId);
        if (!usable) throw new InvalidInput(GONE);
        if (await isInSyllabus(tx, owned, conceptId)) throw new InvalidInput("That concept is already in this syllabus.");
        await appendConcept(tx, weekId, conceptId);
    });
}

/** Moves a concept to another week of the same syllabus, and renames it if it was added just for this student. */
export async function updateConcept(weekId: string, conceptId: string, formData: FormData): Promise<FormResult> {
    return asWeekEditor(weekId, async (tx, owned) => {
        const [found] = await tx.select({ studentId: concept.studentId }).from(concept).where(eq(concept.id, conceptId));
        if (!found) throw new InvalidInput(GONE);
        // Standard concepts are shared by every student, so only admins rename them, from the standard syllabus
        if (found.studentId === owned.studentId) await tx.update(concept).set({ name: text(formData, "name", "Concept") }).where(eq(concept.id, conceptId));

        const targetWeekId = String(formData.get("weekId") ?? weekId);
        if (targetWeekId === weekId) return;
        const [target] = UUID.test(targetWeekId)
            ? await tx
                  .select({ id: studentWeek.id })
                  .from(studentWeek)
                  .where(and(eq(studentWeek.id, targetWeekId), eq(studentWeek.studentId, owned.studentId), eq(studentWeek.subjectId, owned.subjectId)))
            : [];
        if (!target) throw new InvalidInput("That week is no longer in this syllabus. Refresh and try again.");
        const moved = await tx
            .delete(studentWeekConcept)
            .where(and(eq(studentWeekConcept.studentWeekId, weekId), eq(studentWeekConcept.conceptId, conceptId)))
            .returning({ id: studentWeekConcept.conceptId });
        if (moved.length === 0) throw new InvalidInput(GONE);
        await appendConcept(tx, targetWeekId, conceptId);
    });
}

/** Takes a concept out of the syllabus. The concept itself is kept, so past lessons and Done ticks still show it. */
export async function removeConcept(weekId: string, conceptId: string): Promise<FormResult> {
    return asWeekEditor(weekId, (tx) => tx.delete(studentWeekConcept).where(and(eq(studentWeekConcept.studentWeekId, weekId), eq(studentWeekConcept.conceptId, conceptId))));
}

/** Saves a week's concepts in a new order, from a drag-and-drop. */
export async function reorderConcepts(weekId: string, orderedIds: string[]): Promise<FormResult> {
    return asWeekEditor(weekId, async (tx) => {
        const current = await tx
            .select({ conceptId: studentWeekConcept.conceptId, position: studentWeekConcept.position })
            .from(studentWeekConcept)
            .where(eq(studentWeekConcept.studentWeekId, weekId));
        const positions = new Map(current.map((c) => [c.conceptId, c.position]));
        for (const [index, conceptId] of readOrder(orderedIds, current.map((c) => c.conceptId)).entries()) {
            if (positions.get(conceptId) !== index + 1) {
                await tx
                    .update(studentWeekConcept)
                    .set({ position: index + 1 })
                    .where(and(eq(studentWeekConcept.studentWeekId, weekId), eq(studentWeekConcept.conceptId, conceptId)));
            }
        }
    });
}
