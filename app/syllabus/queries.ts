import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapter, concept, subject, test, testChapter, week, worksheet, worksheetConcept } from "@/db/schema";
import type { TestType } from "@/lib/tests";

export type Subject = { id: string; level: string; name: string };
export type Concept = { id: string; name: string };
export type Week = { id: string; chapterId: string; number: number; durationMin: number; concepts: Concept[] };
export type Chapter = { id: string; name: string; weeks: Week[] };
export type SubjectPlan = { subject: Subject; chapters: Chapter[] };
export type WorksheetSummary = { id: string; name: string; durationMin: number | null; concepts: (Concept & { weekNumber: number })[] };
export type TestSummary = { id: string; name: string; type: TestType; durationMin: number | null; chapterIds: string[] };

export async function listSubjects() {
    return db
        .select({ id: subject.id, level: subject.level, name: subject.name, weekCount: count(week.id) })
        .from(subject)
        .leftJoin(week, eq(week.subjectId, subject.id))
        .groupBy(subject.id)
        .orderBy(asc(subject.level), asc(subject.name));
}

export async function getSubjectPlan(subjectId: string): Promise<SubjectPlan | null> {
    const [[found], chapters, weeks, concepts] = await Promise.all([
        db.select({ id: subject.id, level: subject.level, name: subject.name }).from(subject).where(eq(subject.id, subjectId)),
        db.select({ id: chapter.id, name: chapter.name }).from(chapter).where(eq(chapter.subjectId, subjectId)).orderBy(asc(chapter.createdAt)),
        db
            .select({ id: week.id, chapterId: week.chapterId, number: week.number, durationMin: week.durationMin })
            .from(week)
            .where(eq(week.subjectId, subjectId))
            .orderBy(asc(week.number)),
        db
            .select({ id: concept.id, name: concept.name, weekId: concept.weekId })
            .from(concept)
            .innerJoin(week, eq(concept.weekId, week.id))
            .where(eq(week.subjectId, subjectId))
            .orderBy(asc(concept.position), asc(concept.createdAt)),
    ]);
    if (!found) return null;

    const weekById = new Map<string, Week>(weeks.map((w) => [w.id, { ...w, concepts: [] }]));
    for (const { weekId, ...item } of concepts) weekById.get(weekId)?.concepts.push(item);

    const chapterList: Chapter[] = chapters.map((c) => ({ ...c, weeks: [...weekById.values()].filter((w) => w.chapterId === c.id) }));
    // Order chapters by their first week; chapters without weeks go last
    const firstWeek = (c: Chapter) => c.weeks[0]?.number ?? Infinity;
    chapterList.sort((a, b) => firstWeek(a) - firstWeek(b));

    return { subject: found, chapters: chapterList };
}

/** A subject's worksheets with their concepts, ordered by the earliest week they cover. */
export async function listWorksheets(subjectId: string): Promise<WorksheetSummary[]> {
    const [sheets, links] = await Promise.all([
        db.select({ id: worksheet.id, name: worksheet.name, durationMin: worksheet.durationMin }).from(worksheet).where(eq(worksheet.subjectId, subjectId)),
        db
            .select({ worksheetId: worksheetConcept.worksheetId, id: concept.id, name: concept.name, weekNumber: week.number })
            .from(worksheetConcept)
            .innerJoin(worksheet, eq(worksheetConcept.worksheetId, worksheet.id))
            .innerJoin(concept, eq(worksheetConcept.conceptId, concept.id))
            .innerJoin(week, eq(concept.weekId, week.id))
            .where(eq(worksheet.subjectId, subjectId))
            .orderBy(asc(week.number), asc(concept.position), asc(concept.createdAt)),
    ]);

    const byId = new Map<string, WorksheetSummary>(sheets.map((s) => [s.id, { ...s, concepts: [] }]));
    for (const { worksheetId, ...item } of links) byId.get(worksheetId)?.concepts.push(item);

    const firstWeek = (s: WorksheetSummary) => s.concepts[0]?.weekNumber ?? Infinity;
    return [...byId.values()].sort((a, b) => firstWeek(a) - firstWeek(b) || a.name.localeCompare(b.name));
}

export async function getWorksheet(worksheetId: string) {
    const [[found], links] = await Promise.all([
        db.select({ id: worksheet.id, subjectId: worksheet.subjectId, name: worksheet.name, durationMin: worksheet.durationMin }).from(worksheet).where(eq(worksheet.id, worksheetId)),
        db.select({ conceptId: worksheetConcept.conceptId }).from(worksheetConcept).where(eq(worksheetConcept.worksheetId, worksheetId)),
    ]);
    return found ? { ...found, conceptIds: links.map((l) => l.conceptId) } : null;
}

/** A subject's tests with the chapters they cover. Pages order them using the subject plan. */
export async function listTests(subjectId: string): Promise<TestSummary[]> {
    const [tests, links] = await Promise.all([
        db.select({ id: test.id, name: test.name, type: test.type, durationMin: test.durationMin }).from(test).where(eq(test.subjectId, subjectId)).orderBy(asc(test.name)),
        db
            .select({ testId: testChapter.testId, chapterId: testChapter.chapterId })
            .from(testChapter)
            .innerJoin(test, eq(testChapter.testId, test.id))
            .where(eq(test.subjectId, subjectId)),
    ]);
    return tests.map((t) => ({ ...t, chapterIds: links.filter((l) => l.testId === t.id).map((l) => l.chapterId) }));
}

export async function getTest(testId: string) {
    const [[found], links] = await Promise.all([
        db.select({ id: test.id, subjectId: test.subjectId, name: test.name, type: test.type, durationMin: test.durationMin }).from(test).where(eq(test.id, testId)),
        db.select({ chapterId: testChapter.chapterId }).from(testChapter).where(eq(testChapter.testId, testId)),
    ]);
    return found ? { ...found, chapterIds: links.map((l) => l.chapterId) } : null;
}
