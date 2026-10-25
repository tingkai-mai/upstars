import { asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { checkIn, checkInConcept, checkInTest, checkInWorksheet, concept, subject, test, user, week, worksheet } from "@/db/schema";

const recorder = alias(user, "recorder");

export type PastCheckIn = {
    id: string;
    lessonDate: string;
    remarks: string;
    subject: string;
    /** Null if that user has since been deleted */
    recordedByName: string | null;
    concepts: string[];
    worksheets: string[];
    tests: string[];
};

/** A student's check-ins by anyone, across all subjects, newest lesson first. */
export async function listPastCheckIns(studentId: string, limit = 50): Promise<PastCheckIn[]> {
    const rows = await db
        .select({ id: checkIn.id, lessonDate: checkIn.lessonDate, remarks: checkIn.remarks, level: subject.level, subjectName: subject.name, recordedByName: recorder.name })
        .from(checkIn)
        .innerJoin(subject, eq(checkIn.subjectId, subject.id))
        .leftJoin(recorder, eq(checkIn.recordedBy, recorder.id))
        .where(eq(checkIn.studentId, studentId))
        .orderBy(desc(checkIn.lessonDate), desc(checkIn.createdAt))
        .limit(limit);
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [concepts, worksheets, tests] = await Promise.all([
        db
            .select({ checkInId: checkInConcept.checkInId, name: concept.name })
            .from(checkInConcept)
            .innerJoin(concept, eq(checkInConcept.conceptId, concept.id))
            .innerJoin(week, eq(concept.weekId, week.id))
            .where(inArray(checkInConcept.checkInId, ids))
            .orderBy(asc(week.number), asc(concept.position)),
        db
            .select({ checkInId: checkInWorksheet.checkInId, name: worksheet.name })
            .from(checkInWorksheet)
            .innerJoin(worksheet, eq(checkInWorksheet.worksheetId, worksheet.id))
            .where(inArray(checkInWorksheet.checkInId, ids))
            .orderBy(asc(worksheet.name)),
        db
            .select({ checkInId: checkInTest.checkInId, name: test.name })
            .from(checkInTest)
            .innerJoin(test, eq(checkInTest.testId, test.id))
            .where(inArray(checkInTest.checkInId, ids))
            .orderBy(asc(test.name)),
    ]);
    const namesFor = (items: { checkInId: string; name: string }[], id: string) => items.filter((i) => i.checkInId === id).map((i) => i.name);

    return rows.map(({ level, subjectName, ...row }) => ({
        ...row,
        subject: `${level} ${subjectName}`,
        concepts: namesFor(concepts, row.id),
        worksheets: namesFor(worksheets, row.id),
        tests: namesFor(tests, row.id),
    }));
}
