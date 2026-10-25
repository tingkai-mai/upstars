import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const syllabus = pgTable("syllabus", {
    id: uuid("id").primaryKey().defaultRandom(),
    subject: text("subject").notNull(),
    level: text("level").notNull(),
    topic: text("topic").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export * from "./auth-schema";
