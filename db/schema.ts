import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { TEST_TYPES } from "../lib/tests";
import { user } from "./auth-schema";

/** A subject taught at a level, e.g. P6 Mathematics. */
export const subject = pgTable(
    "subject",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        level: text("level").notNull(),
        name: text("name").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [unique("subject_level_name_unique").on(table.level, table.name)],
);

/** A chapter spans one or more weeks. Chapters are ordered by their earliest week. */
export const chapter = pgTable(
    "chapter",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        subjectId: uuid("subject_id").notNull().references(() => subject.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        unique("chapter_subject_name_unique").on(table.subjectId, table.name),
        // Target for week's composite foreign key
        unique("chapter_id_subject_unique").on(table.id, table.subjectId),
    ],
);

/** One week of a subject's plan. durationMin is the concept-teaching time for the week. */
export const week = pgTable(
    "week",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        subjectId: uuid("subject_id").notNull(),
        chapterId: uuid("chapter_id").notNull(),
        number: integer("number").notNull(),
        durationMin: integer("duration_min").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        unique("week_subject_number_unique").on(table.subjectId, table.number),
        // Composite key guarantees the week's chapter belongs to the same subject
        foreignKey({ name: "week_chapter_fk", columns: [table.chapterId, table.subjectId], foreignColumns: [chapter.id, chapter.subjectId] }).onDelete("cascade"),
        index("week_chapter_id_idx").on(table.chapterId),
        check("week_number_positive", sql`${table.number} > 0`),
        check("week_duration_non_negative", sql`${table.durationMin} >= 0`),
    ],
);

/** A concept taught in a week. position orders concepts within the week. */
export const concept = pgTable(
    "concept",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        weekId: uuid("week_id").notNull().references(() => week.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("concept_week_id_position_idx").on(table.weekId, table.position)],
);

/** A worksheet for a subject. durationMin is the full worksheet time, shared across its concepts; null if not set. */
export const worksheet = pgTable(
    "worksheet",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        subjectId: uuid("subject_id").notNull().references(() => subject.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        durationMin: integer("duration_min"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        unique("worksheet_subject_name_unique").on(table.subjectId, table.name),
        check("worksheet_duration_non_negative", sql`${table.durationMin} >= 0`),
    ],
);

/** The concepts a worksheet covers. Concepts must belong to the worksheet's subject (checked in the app). */
export const worksheetConcept = pgTable(
    "worksheet_concept",
    {
        worksheetId: uuid("worksheet_id").notNull().references(() => worksheet.id, { onDelete: "cascade" }),
        conceptId: uuid("concept_id").notNull().references(() => concept.id, { onDelete: "cascade" }),
    },
    (table) => [primaryKey({ columns: [table.worksheetId, table.conceptId] }), index("worksheet_concept_concept_id_idx").on(table.conceptId)],
);

export const testType = pgEnum("test_type", TEST_TYPES);

/** A test (capstone or monthly check) for a subject, covering whole chapters. durationMin is null if not set. */
export const test = pgTable(
    "test",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        subjectId: uuid("subject_id").notNull().references(() => subject.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        type: testType("type").notNull(),
        durationMin: integer("duration_min"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        unique("test_subject_name_unique").on(table.subjectId, table.name),
        check("test_duration_non_negative", sql`${table.durationMin} >= 0`),
    ],
);

/** The chapters a test covers. Chapters must belong to the test's subject (checked in the app). */
export const testChapter = pgTable(
    "test_chapter",
    {
        testId: uuid("test_id").notNull().references(() => test.id, { onDelete: "cascade" }),
        chapterId: uuid("chapter_id").notNull().references(() => chapter.id, { onDelete: "cascade" }),
    },
    (table) => [primaryKey({ columns: [table.testId, table.chapterId] }), index("test_chapter_chapter_id_idx").on(table.chapterId)],
);

/** Matches a tutor with a student. Each tutor–student pair can exist only once. */
export const pairing = pgTable(
    "pairing",
    {
        tutorId: text("tutor_id").notNull().references(() => user.id, { onDelete: "cascade" }),
        studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.tutorId, table.studentId] }),
        index("pairing_student_id_idx").on(table.studentId),
        check("pairing_not_self", sql`${table.tutorId} <> ${table.studentId}`),
    ],
);

/**
 * A student's quarterly goal for a subject, in marks out of totalMarks. actualMarks is null until known.
 * quarter is derived from month, so a student can have only one goal per subject per quarter.
 */
export const goal = pgTable(
    "goal",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
        subjectId: uuid("subject_id").notNull().references(() => subject.id, { onDelete: "cascade" }),
        year: integer("year").notNull(),
        month: integer("month").notNull(),
        quarter: integer("quarter").generatedAlwaysAs(sql`(month - 1) / 3 + 1`),
        totalMarks: integer("total_marks").notNull(),
        targetMarks: integer("target_marks").notNull(),
        actualMarks: integer("actual_marks"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        unique("goal_student_subject_quarter_unique").on(table.studentId, table.subjectId, table.year, table.quarter),
        check("goal_month_valid", sql`${table.month} BETWEEN 1 AND 12`),
        check("goal_year_valid", sql`${table.year} BETWEEN 2000 AND 2100`),
        check("goal_total_positive", sql`${table.totalMarks} > 0`),
        check("goal_target_in_range", sql`${table.targetMarks} BETWEEN 0 AND ${table.totalMarks}`),
        check("goal_actual_in_range", sql`${table.actualMarks} BETWEEN 0 AND ${table.totalMarks}`),
    ],
);

/** Shared shape of the completion tables: who completed what, when, and who recorded it. */
const completionColumns = {
    studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
};

export const conceptCompletion = pgTable(
    "concept_completion",
    { ...completionColumns, conceptId: uuid("concept_id").notNull().references(() => concept.id, { onDelete: "cascade" }) },
    (table) => [primaryKey({ columns: [table.studentId, table.conceptId] }), index("concept_completion_concept_id_idx").on(table.conceptId)],
);

export const worksheetCompletion = pgTable(
    "worksheet_completion",
    { ...completionColumns, worksheetId: uuid("worksheet_id").notNull().references(() => worksheet.id, { onDelete: "cascade" }) },
    (table) => [primaryKey({ columns: [table.studentId, table.worksheetId] }), index("worksheet_completion_worksheet_id_idx").on(table.worksheetId)],
);

export const testCompletion = pgTable(
    "test_completion",
    { ...completionColumns, testId: uuid("test_id").notNull().references(() => test.id, { onDelete: "cascade" }) },
    (table) => [primaryKey({ columns: [table.studentId, table.testId] }), index("test_completion_test_id_idx").on(table.testId)],
);

export * from "./auth-schema";
