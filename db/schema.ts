import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const syllabus = pgTable("syllabus", {
    id: uuid("id").primaryKey().defaultRandom(),
    subject: text("subject").notNull(),
    level: text("level").notNull(),
    topic: text("topic").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export * from "./auth-schema";
