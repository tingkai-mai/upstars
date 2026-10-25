import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { concept, conceptCompletion, goal, test, testCompletion, week, worksheet, worksheetCompletion } from "@/db/schema";

export type Goal = { id: string; year: number; month: number; quarter: number; totalMarks: number; targetMarks: number; actualMarks: number | null };

/** What this student has completed in this subject: item id → completion date. */
export async function getCompletion(studentId: string, subjectId: string) {
    const [concepts, worksheets, tests] = await Promise.all([
        db
            .select({ id: conceptCompletion.conceptId, completedAt: conceptCompletion.completedAt })
            .from(conceptCompletion)
            .innerJoin(concept, eq(conceptCompletion.conceptId, concept.id))
            .innerJoin(week, eq(concept.weekId, week.id))
            .where(and(eq(conceptCompletion.studentId, studentId), eq(week.subjectId, subjectId))),
        db
            .select({ id: worksheetCompletion.worksheetId, completedAt: worksheetCompletion.completedAt })
            .from(worksheetCompletion)
            .innerJoin(worksheet, eq(worksheetCompletion.worksheetId, worksheet.id))
            .where(and(eq(worksheetCompletion.studentId, studentId), eq(worksheet.subjectId, subjectId))),
        db
            .select({ id: testCompletion.testId, completedAt: testCompletion.completedAt })
            .from(testCompletion)
            .innerJoin(test, eq(testCompletion.testId, test.id))
            .where(and(eq(testCompletion.studentId, studentId), eq(test.subjectId, subjectId))),
    ]);
    const toMap = (rows: { id: string; completedAt: Date }[]) => new Map(rows.map((r) => [r.id, r.completedAt]));
    return { concepts: toMap(concepts), worksheets: toMap(worksheets), tests: toMap(tests) };
}

export type Completion = Awaited<ReturnType<typeof getCompletion>>;

/** Newest first */
export async function listGoals(studentId: string, subjectId: string): Promise<Goal[]> {
    const rows = await db
        .select({
            id: goal.id,
            year: goal.year,
            month: goal.month,
            quarter: goal.quarter,
            totalMarks: goal.totalMarks,
            targetMarks: goal.targetMarks,
            actualMarks: goal.actualMarks,
        })
        .from(goal)
        .where(and(eq(goal.studentId, studentId), eq(goal.subjectId, subjectId)))
        .orderBy(desc(goal.year), desc(goal.month));
    // quarter is a generated column, so it's always present
    return rows.map((r) => ({ ...r, quarter: r.quarter ?? Math.floor((r.month - 1) / 3) + 1 }));
}
