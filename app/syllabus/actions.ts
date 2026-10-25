"use server";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapter, concept, subject, test, testChapter, week, worksheet, worksheetConcept } from "@/db/schema";
import { isTestType } from "@/lib/tests";
import { getAdminSession } from "@/lib/session";
import { assertFound, InvalidInput, optionalWholeNumber, runMutation, text, wholeNumber, type FormResult } from "@/lib/form-data";

export type { FormResult };

/** A blank field means "not set". */
function optionalMinutes(formData: FormData, key: string, label: string) {
    return optionalWholeNumber(formData, key, label, { max: 1_440 });
}

/** Runs an admin-only change, turning bad input and constraint violations into form errors. */
async function mutate(work: () => Promise<unknown>, duplicateMessage?: string): Promise<FormResult> {
    if (!(await getAdminSession())) return { error: "Only admins can edit the syllabus." };
    return runMutation(work, duplicateMessage);
}

// Subjects

export async function createSubject(formData: FormData) {
    return mutate(
        () => db.insert(subject).values({ level: text(formData, "level", "Level"), name: text(formData, "name", "Subject") }),
        "That subject already exists for this level.",
    );
}

export async function updateSubject(id: string, formData: FormData) {
    return mutate(async () => {
        const values = { level: text(formData, "level", "Level"), name: text(formData, "name", "Subject") };
        assertFound(await db.update(subject).set(values).where(eq(subject.id, id)).returning({ id: subject.id }));
    }, "That subject already exists for this level.");
}

export async function deleteSubject(id: string) {
    // If this was the selected subject, the page falls back to the first remaining one
    return mutate(() => db.delete(subject).where(eq(subject.id, id)));
}

// Chapters

export async function createChapter(subjectId: string, formData: FormData) {
    return mutate(() => db.insert(chapter).values({ subjectId, name: text(formData, "name", "Chapter name") }), "This subject already has a chapter with that name.");
}

export async function updateChapter(id: string, formData: FormData) {
    return mutate(async () => {
        const name = text(formData, "name", "Chapter name");
        assertFound(await db.update(chapter).set({ name }).where(eq(chapter.id, id)).returning({ id: chapter.id }));
    }, "This subject already has a chapter with that name.");
}

export async function deleteChapter(id: string) {
    return mutate(() => db.delete(chapter).where(eq(chapter.id, id)));
}

// Weeks

const DUPLICATE_WEEK = "That week number is already used in this subject.";

function weekValues(formData: FormData) {
    return {
        number: wholeNumber(formData, "number", "Week number", { min: 1, max: 520 }),
        durationMin: wholeNumber(formData, "durationMin", "Teaching time", { max: 1_440 }),
    };
}

export async function createWeek(subjectId: string, chapterId: string, formData: FormData) {
    return mutate(() => db.insert(week).values({ subjectId, chapterId, ...weekValues(formData) }), DUPLICATE_WEEK);
}

export async function updateWeek(id: string, formData: FormData) {
    return mutate(async () => {
        // The composite foreign key rejects a chapter from another subject
        const values = { ...weekValues(formData), chapterId: text(formData, "chapterId", "Chapter") };
        assertFound(await db.update(week).set(values).where(eq(week.id, id)).returning({ id: week.id }));
    }, DUPLICATE_WEEK);
}

export async function deleteWeek(id: string) {
    return mutate(() => db.delete(week).where(eq(week.id, id)));
}

// Concepts

export async function createConcept(weekId: string, formData: FormData) {
    return mutate(() =>
        db.insert(concept).values({
            weekId,
            name: text(formData, "name", "Concept"),
            // Append to the end of the week
            position: sql`(SELECT COALESCE(MAX(${concept.position}), 0) + 1 FROM ${concept} WHERE ${concept.weekId} = ${weekId})`,
        }),
    );
}

export async function updateConcept(id: string, formData: FormData) {
    return mutate(async () => {
        const name = text(formData, "name", "Concept");
        assertFound(await db.update(concept).set({ name }).where(eq(concept.id, id)).returning({ id: concept.id }));
    });
}

export async function deleteConcept(id: string) {
    return mutate(() => db.delete(concept).where(eq(concept.id, id)));
}

/** Swaps a concept with its neighbour, then renumbers the week 1…n to close any gaps or ties. */
export async function moveConcept(id: string, direction: "up" | "down") {
    return mutate(() =>
        db.transaction(async (tx) => {
            if (direction !== "up" && direction !== "down") throw new InvalidInput("Invalid direction.");
            const [target] = await tx.select({ weekId: concept.weekId }).from(concept).where(eq(concept.id, id));
            assertFound(target ? [target] : []);

            // Lock the week's concepts so concurrent moves can't interleave
            const ordered = await tx
                .select({ id: concept.id, position: concept.position })
                .from(concept)
                .where(eq(concept.weekId, target.weekId))
                .orderBy(asc(concept.position), asc(concept.createdAt))
                .for("update");
            const from = ordered.findIndex((c) => c.id === id);
            const to = direction === "up" ? from - 1 : from + 1;
            if (to < 0 || to >= ordered.length) return; // already at the edge
            [ordered[from], ordered[to]] = [ordered[to], ordered[from]];

            for (const [index, item] of ordered.entries()) {
                if (item.position !== index + 1) await tx.update(concept).set({ position: index + 1 }).where(eq(concept.id, item.id));
            }
        }),
    );
}

// Worksheets

const DUPLICATE_WORKSHEET = "This subject already has a worksheet with that name.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Reads the ids ticked under `key`, deduplicated; non-UUIDs (tampered input) are rejected. */
function checkedIds(formData: FormData, key: string, emptyMessage: string) {
    const ids = [...new Set(formData.getAll(key).map(String))];
    if (ids.length === 0) throw new InvalidInput(emptyMessage);
    if (!ids.every((id) => UUID.test(id))) throw new InvalidInput("Invalid selection. Refresh and try again.");
    return ids;
}

function assertAllFound(found: unknown[], ids: string[], what: string) {
    if (found.length !== ids.length) throw new InvalidInput(`Some ${what} are no longer in this subject. Refresh and try again.`);
}

/** Reads a worksheet form, checking that every chosen concept belongs to the subject. */
async function readWorksheet(tx: Transaction, subjectId: string, formData: FormData) {
    const name = text(formData, "name", "Worksheet name");
    const durationMin = optionalMinutes(formData, "durationMin", "Worksheet time");
    const conceptIds = checkedIds(formData, "conceptId", "Choose at least one concept.");
    const found = await tx
        .select({ id: concept.id })
        .from(concept)
        .innerJoin(week, eq(concept.weekId, week.id))
        .where(and(eq(week.subjectId, subjectId), inArray(concept.id, conceptIds)));
    assertAllFound(found, conceptIds, "concepts");
    return { name, durationMin, conceptIds };
}

const worksheetListUrl = (subjectId: string) => `/syllabus/worksheets?subject=${subjectId}`;

// Create and update return instead of redirecting, so the builder can clear itself before navigating
export async function createWorksheet(subjectId: string, formData: FormData): Promise<FormResult> {
    return mutate(
        () =>
            db.transaction(async (tx) => {
                const { conceptIds, ...values } = await readWorksheet(tx, subjectId, formData);
                const [created] = await tx.insert(worksheet).values({ subjectId, ...values }).returning({ id: worksheet.id });
                await tx.insert(worksheetConcept).values(conceptIds.map((conceptId) => ({ worksheetId: created.id, conceptId })));
            }),
        DUPLICATE_WORKSHEET,
    );
}

export async function updateWorksheet(id: string, formData: FormData): Promise<FormResult> {
    return mutate(
        () =>
            db.transaction(async (tx) => {
                const [existing] = await tx.select({ subjectId: worksheet.subjectId }).from(worksheet).where(eq(worksheet.id, id));
                assertFound(existing ? [existing] : []);
                const { conceptIds, ...values } = await readWorksheet(tx, existing.subjectId, formData);
                await tx.update(worksheet).set(values).where(eq(worksheet.id, id));
                await tx.delete(worksheetConcept).where(eq(worksheetConcept.worksheetId, id));
                await tx.insert(worksheetConcept).values(conceptIds.map((conceptId) => ({ worksheetId: id, conceptId })));
            }),
        DUPLICATE_WORKSHEET,
    );
}

export async function deleteWorksheet(id: string): Promise<FormResult> {
    let subjectId = "";
    const result = await mutate(async () => {
        const [deleted] = await db.delete(worksheet).where(eq(worksheet.id, id)).returning({ subjectId: worksheet.subjectId });
        assertFound(deleted ? [deleted] : []);
        subjectId = deleted.subjectId;
    });
    if (result.error) return result;
    redirect(worksheetListUrl(subjectId));
}

// Tests

const DUPLICATE_TEST = "This subject already has a test with that name.";

/** Reads a test form, checking that every chosen chapter belongs to the subject. */
async function readTest(tx: Transaction, subjectId: string, formData: FormData) {
    const name = text(formData, "name", "Test name");
    const type = formData.get("type");
    if (!isTestType(type)) throw new InvalidInput("Choose a test type.");
    const durationMin = optionalMinutes(formData, "durationMin", "Test time");
    const chapterIds = checkedIds(formData, "chapterId", "Choose at least one chapter.");
    const found = await tx
        .select({ id: chapter.id })
        .from(chapter)
        .where(and(eq(chapter.subjectId, subjectId), inArray(chapter.id, chapterIds)));
    assertAllFound(found, chapterIds, "chapters");
    return { name, type, durationMin, chapterIds };
}

const testListUrl = (subjectId: string, type: string) => `/syllabus/tests?subject=${subjectId}&type=${type}`;

// Create and update return instead of redirecting, so the builder can clear itself before navigating
export async function createTest(subjectId: string, formData: FormData): Promise<FormResult> {
    return mutate(
        () =>
            db.transaction(async (tx) => {
                const { chapterIds, ...values } = await readTest(tx, subjectId, formData);
                const [created] = await tx.insert(test).values({ subjectId, ...values }).returning({ id: test.id });
                await tx.insert(testChapter).values(chapterIds.map((chapterId) => ({ testId: created.id, chapterId })));
            }),
        DUPLICATE_TEST,
    );
}

export async function updateTest(id: string, formData: FormData): Promise<FormResult> {
    return mutate(
        () =>
            db.transaction(async (tx) => {
                const [existing] = await tx.select({ subjectId: test.subjectId }).from(test).where(eq(test.id, id));
                assertFound(existing ? [existing] : []);
                const { chapterIds, ...values } = await readTest(tx, existing.subjectId, formData);
                await tx.update(test).set(values).where(eq(test.id, id));
                await tx.delete(testChapter).where(eq(testChapter.testId, id));
                await tx.insert(testChapter).values(chapterIds.map((chapterId) => ({ testId: id, chapterId })));
            }),
        DUPLICATE_TEST,
    );
}

export async function deleteTest(id: string): Promise<FormResult> {
    let listUrl = "";
    const result = await mutate(async () => {
        const [deleted] = await db.delete(test).where(eq(test.id, id)).returning({ subjectId: test.subjectId, type: test.type });
        assertFound(deleted ? [deleted] : []);
        listUrl = testListUrl(deleted.subjectId, deleted.type);
    });
    if (result.error) return result;
    redirect(listUrl);
}
