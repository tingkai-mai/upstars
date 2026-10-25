// Wipes EVERY table and refills the app with demo data. For demos and local development only.
// Usage: npm run db:reset              (asks for confirmation)
//        npm run db:reset -- --yes     (no prompt)
//        npm run db:reset -- --dry-run (does everything, then rolls back: nothing changes)
//
// Adding a table: it's wiped automatically, since every table in the public schema is truncated.
// To give it data, write a step below and add it to STEPS. Tables left empty are listed at the end.
// Dropping a table: remove its step, if it has one.
import { createHmac, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { seedSyllabus } from "./seed-syllabus.mjs";

// ---------------------------------------------------------------------------------------------
// Data you might want to edit. People are referred to by key elsewhere in this file.

/** Every seeded account except the demo ones signs in with this. */
const SHARED_PASSWORD = "upstars-demo";

/** Must match lib/demo-accounts.ts. Their passwords are derived the same way as app/(auth)/demo-actions.ts. */
const DEMO = {
    admin: { key: "demo-admin", name: "Demo Admin", email: "demo-admin@upstars.demo" },
    tutor: { key: "demo-tutor", name: "Demo Tutor", email: "demo-tutor@upstars.demo" },
    student: { key: "demo-student", name: "Demo Student", email: "demo-student@upstars.demo" },
};

const ADMINS = [DEMO.admin, { key: "grace", name: "Grace Lim", email: "grace@upstars.test" }];

const TUTORS = [
    DEMO.tutor,
    { key: "daniel", name: "Daniel Tan", email: "daniel@upstars.test" },
    { key: "priya", name: "Priya Nair", email: "priya@upstars.test" },
    { key: "marcus", name: "Marcus Wong", email: "marcus@upstars.test" },
    { key: "aisha", name: "Aisha Rahman", email: "aisha@upstars.test" },
];

/**
 * tutor: their main tutor (pairing), if any. lessons: weekly check-ins, most recent last Saturday.
 * pastTutor + pastLessons: the first lessons were with someone else, so profiles show "Also taught by".
 */
const STUDENTS = [
    { ...DEMO.student, level: "Primary 6", tutor: "demo-tutor", lessons: 8 },
    { key: "ethan", name: "Ethan Koh", email: "ethan@upstars.test", level: "Primary 6", tutor: "daniel", lessons: 12 },
    { key: "chloe", name: "Chloe Ng", email: "chloe@upstars.test", level: "Primary 6", tutor: "daniel", lessons: 9 },
    { key: "ryan", name: "Ryan Teo", email: "ryan@upstars.test", level: "Primary 6", tutor: "priya", lessons: 11, pastTutor: "marcus", pastLessons: 4 },
    { key: "sophia", name: "Sophia Lee", email: "sophia@upstars.test", level: "Primary 6", tutor: "priya", lessons: 6 },
    { key: "arjun", name: "Arjun Kumar", email: "arjun@upstars.test", level: "Primary 6", tutor: "marcus", lessons: 10 },
    { key: "hannah", name: "Hannah Chua", email: "hannah@upstars.test", level: "Primary 6", tutor: "aisha", lessons: 7 },
    { key: "isaac", name: "Isaac Yeo", email: "isaac@upstars.test", level: "Primary 6", tutor: "aisha", lessons: 3 },
    { key: "zack", name: "Zack Ong", email: "zack@upstars.test", level: "Primary 6", lessons: 2, pastTutor: "daniel", pastLessons: 2 },
    { key: "meiling", name: "Goh Mei Ling", email: "meiling@upstars.test", level: "Primary 5", lessons: 0 },
];

const RESOURCES = [
    { name: "Tutor handbook", url: "https://docs.google.com/document/", description: "How Upstars lessons run, from the first session to the last." },
    { name: "PSLE Mathematics syllabus", url: "https://www.moe.gov.sg/primary/curriculum/syllabus", description: "MOE's official primary syllabuses." },
    { name: "PSLE exam information", url: "https://www.seab.gov.sg/psle/", description: "Exam format, dates and past-year paper details from SEAB." },
    { name: "Khan Academy: Arithmetic", url: "https://www.khanacademy.org/math/arithmetic", description: "Free practice for fractions, decimals and percentages." },
    { name: "Math is Fun", url: "https://www.mathsisfun.com/", description: "Friendly explanations to share with students." },
    { name: "Volunteer feedback form", url: "https://forms.google.com/", description: null },
];

/** {first} is the student's first name, {topic} the chapter covered. */
const REMARKS = [
    "{first} worked through {topic} confidently today. Keep practising the word problems.",
    "Covered {topic}. {first} needed a few hints on the harder questions but got there in the end.",
    "Great focus today! {first} finished the worksheet early and explained the answers back to me.",
    "{first} was a bit tired today, so we went slower on {topic}. Will recap next week.",
    "Good progress on {topic}. Reminded {first} to show working for every step.",
    "{first} found {topic} tricky at first. 10 minutes of practice at home before next lesson would help.",
    "Excellent lesson. {first} is ready to move on from {topic}.",
];

/** For lessons that go over the previous week again. */
const RECAP_REMARKS = [
    "Recapped {topic} since {first} found it tricky last week. Much more confident now.",
    "Went over {topic} again. {first} remembered most of it and only needed help with the last few questions.",
    "Second pass at {topic}: {first} can now explain each step without prompting.",
];

/** Added when a lesson also revisits concepts from an earlier week. */
const REVISION_NOTE = " Also revised some earlier concepts.";

// ---------------------------------------------------------------------------------------------
// Helpers

/** A seeded random generator (mulberry32), so every reset produces the same data. */
function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const random = seededRandom(42);
const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (items) => items[Math.floor(random() * items.length)];

/** YYYY-MM-DD dates in Singapore time. */
const todayInSingapore = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
function addDays(isoDate, days) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
/** The most recent Saturday on or before today: lessons happen on Saturdays. */
function lastSaturday() {
    const today = todayInSingapore();
    return addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 1) % 7));
}
/** Mid-morning on the lesson day, for completion timestamps. */
const lessonTime = (isoDate) => new Date(`${isoDate}T10:00:00+08:00`);

/** Same derivation as app/(auth)/demo-actions.ts, so the Demo tab signs in to these accounts. */
function demoPassword(role) {
    if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is missing from .env.local");
    return createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(`demo-account:${role}`).digest("base64url");
}

let client;

/** Runs queries one after another (one connection can't run them in parallel) and returns each one's rows. */
async function queryAll(queries) {
    const results = [];
    for (const sql of queries) results.push((await client.query(sql)).rows);
    return results;
}

/**
 * Dates are sent as UTC ISO strings: drizzle reads timestamp columns as UTC, while node-postgres would
 * otherwise send them in this machine's local time.
 */
const toParam = (value) => (value instanceof Date ? value.toISOString() : value);

/** Inserts rows (objects keyed by column name) in batches. */
async function insertMany(table, rows) {
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    for (let start = 0; start < rows.length; start += 500) {
        const batch = rows.slice(start, start + 500);
        const placeholders = batch.map((_, row) => `(${columns.map((_, column) => `$${row * columns.length + column + 1}`).join(", ")})`);
        await client.query(`INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders.join(", ")}`, batch.flatMap((row) => columns.map((c) => toParam(row[c]))));
    }
}

// ---------------------------------------------------------------------------------------------
// Steps, run in order. Each one reads and adds to ctx.

async function seedUsers(ctx) {
    const sharedHash = await hashPassword(SHARED_PASSWORD);
    const demoRoleOf = new Map(Object.entries(DEMO).map(([role, person]) => [person.key, role]));
    const people = [...ADMINS.map((p) => ({ ...p, role: "admin" })), ...TUTORS.map((p) => ({ ...p, role: "tutor" })), ...STUDENTS.map((p) => ({ ...p, role: "student" }))];
    const now = new Date();

    const users = [];
    const accounts = [];
    for (const person of people) {
        const id = randomUUID();
        ctx.userIds.set(person.key, id);
        users.push({ id, name: person.name, email: person.email, role: person.role, current_level: person.level ?? null, email_verified: true, created_at: now, updated_at: now });
        const demoRole = demoRoleOf.get(person.key);
        const password = demoRole ? await hashPassword(demoPassword(demoRole)) : sharedHash;
        accounts.push({ id: randomUUID(), account_id: id, provider_id: "credential", user_id: id, password, created_at: now, updated_at: now });
    }
    await insertMany("user", users);
    await insertMany("account", accounts);
}

async function seedSyllabusStep(ctx) {
    await seedSyllabus(client);
    // Load what was created, for check-ins and goals
    const [subjects, weeks, concepts, worksheets, worksheetConcepts, tests, testChapters] = await queryAll([
        `SELECT id, level, name FROM subject ORDER BY level, name`,
        `SELECT w.id, w.subject_id, w.number, w.chapter_id, c.name AS chapter FROM week w JOIN chapter c ON c.id = w.chapter_id ORDER BY w.number`,
        `SELECT c.id, c.week_id FROM concept c ORDER BY c.position`,
        `SELECT id, subject_id FROM worksheet`,
        `SELECT worksheet_id, concept_id FROM worksheet_concept`,
        `SELECT id, subject_id FROM test`,
        `SELECT test_id, chapter_id FROM test_chapter`,
    ]);
    const weekOfConcept = new Map(concepts.map((c) => [c.id, weeks.find((w) => w.id === c.week_id).number]));
    const lastWeekOfChapter = new Map();
    for (const w of weeks) lastWeekOfChapter.set(w.chapter_id, Math.max(lastWeekOfChapter.get(w.chapter_id) ?? 0, w.number));

    // Seed data covers the first subject (P6 Mathematics in the CSVs)
    const subject = subjects[0];
    ctx.syllabus = {
        subjectId: subject.id,
        weeks: weeks
            .filter((w) => w.subject_id === subject.id)
            .map((w) => ({ number: w.number, chapter: w.chapter, conceptIds: concepts.filter((c) => c.week_id === w.id).map((c) => c.id) })),
        // A worksheet is done in the lesson that covers its last week
        worksheets: worksheets
            .filter((ws) => ws.subject_id === subject.id)
            .map((ws) => ({ id: ws.id, week: Math.max(...worksheetConcepts.filter((l) => l.worksheet_id === ws.id).map((l) => weekOfConcept.get(l.concept_id))) })),
        // A test is done in the lesson that finishes its last chapter
        tests: tests
            .filter((t) => t.subject_id === subject.id)
            .map((t) => ({ id: t.id, week: Math.max(...testChapters.filter((l) => l.test_id === t.id).map((l) => lastWeekOfChapter.get(l.chapter_id))) })),
    };
}

async function seedPairings(ctx) {
    await insertMany(
        "pairing",
        STUDENTS.filter((s) => s.tutor).map((s) => ({ tutor_id: ctx.userIds.get(s.tutor), student_id: ctx.userIds.get(s.key) })),
    );
}

/**
 * Weekly check-ins working through the syllabus, plus the completions they imply. Concepts can be covered more than
 * once: some lessons recap the previous week instead of moving on, and some also revise a few earlier concepts.
 * Completions record only the first time, as in the app.
 */
async function seedCheckIns(ctx) {
    const { subjectId, weeks, worksheets, tests } = ctx.syllabus;
    const coverPeople = [...TUTORS.map((t) => t.key), "grace"];
    const rows = { check_in: [], check_in_concept: [], check_in_worksheet: [], check_in_test: [], concept_completion: [], worksheet_completion: [], test_completion: [] };
    const fill = (template, first, week) => template.replaceAll("{first}", first).replaceAll("{topic}", week.chapter.toLowerCase());

    for (const student of STUDENTS) {
        const studentId = ctx.userIds.get(student.key);
        const first = student.name.split(" ")[0];
        const lessons = Math.min(student.lessons, weeks.length);
        const done = { concept: new Set(), worksheet: new Set(), test: new Set() };
        let nextWeek = 0; // index into weeks of the next new week
        let recapNext = false;

        for (let index = 0; index < lessons; index++) {
            // Recap when the last lesson said so, or now and then anyway
            const recap = nextWeek > 0 && (recapNext || random() < 0.15);
            const week = recap ? weeks[nextWeek - 1] : weeks[nextWeek++];
            // Sometimes also revise 1–2 concepts from an earlier week
            const earlier = weeks.slice(0, Math.max(0, nextWeek - 1)).filter((w) => w.conceptIds.length);
            const revised = earlier.length && random() < 0.3 ? pick(earlier).conceptIds.slice(0, randomInt(1, 2)) : [];

            const lessonDate = addDays(lastSaturday(), -7 * (lessons - 1 - index));
            const usual = index < (student.pastLessons ?? 0) ? student.pastTutor : student.tutor;
            // Now and then someone else covers the lesson
            const tutorKey = random() < 0.1 ? pick(coverPeople.filter((k) => k !== usual)) : usual;
            const recordedBy = ctx.userIds.get(tutorKey);
            const id = randomUUID();

            const template = pick(recap ? RECAP_REMARKS : REMARKS);
            recapNext = template.includes("recap next week");
            rows.check_in.push({
                id,
                student_id: studentId,
                subject_id: subjectId,
                lesson_date: lessonDate,
                remarks: fill(template, first, week) + (revised.length ? REVISION_NOTE : ""),
                attendance_points: random() < 0.9 ? 2 : 1,
                behaviour_points: randomInt(random() < 0.1 ? 0 : 1, 2),
                bonus_points: randomInt(0, 2),
                recorded_by: recordedBy,
                created_at: lessonTime(lessonDate),
            });

            const completion = { student_id: studentId, completed_at: lessonTime(lessonDate), recorded_by: recordedBy };
            /** Links the item to this check-in, and marks it done unless it already was. */
            const cover = (kind, itemId) => {
                rows[`check_in_${kind}`].push({ check_in_id: id, [`${kind}_id`]: itemId });
                if (done[kind].has(itemId)) return;
                done[kind].add(itemId);
                rows[`${kind}_completion`].push({ ...completion, [`${kind}_id`]: itemId });
            };
            for (const conceptId of [...week.conceptIds, ...revised]) cover("concept", conceptId);
            // Worksheets and tests for this week that aren't done yet (a recap can catch up on them)
            for (const w of worksheets) if (w.week === week.number && !done.worksheet.has(w.id) && random() < 0.8) cover("worksheet", w.id);
            for (const t of tests) if (t.week === week.number && !done.test.has(t.id) && random() < 0.7) cover("test", t.id);
        }
    }
    for (const [table, tableRows] of Object.entries(rows)) await insertMany(table, tableRows);
}

/** Quarterly goals for this year so far; the current quarter's result isn't in yet. */
async function seedGoals(ctx) {
    const [year, month] = todayInSingapore().split("-").map(Number);
    const currentQuarter = Math.floor((month - 1) / 3) + 1;
    const goals = [];
    for (const student of STUDENTS.filter((s) => s.lessons > 0)) {
        for (let quarter = 1; quarter <= currentQuarter; quarter++) {
            const target = randomInt(12, 17) * 5; // 60–85
            const actual = quarter === currentQuarter ? null : Math.min(100, Math.max(0, target + randomInt(-15, 10)));
            goals.push({
                id: randomUUID(),
                student_id: ctx.userIds.get(student.key),
                subject_id: ctx.syllabus.subjectId,
                year,
                month: (quarter - 1) * 3 + 1,
                total_marks: 100,
                target_marks: target,
                actual_marks: actual,
            });
        }
    }
    await insertMany("goal", goals);
}

async function seedResources() {
    await insertMany(
        "resource",
        RESOURCES.map((r, index) => ({ id: randomUUID(), ...r, position: index + 1 })),
    );
}

const STEPS = [seedUsers, seedSyllabusStep, seedPairings, seedCheckIns, seedGoals, seedResources];

// ---------------------------------------------------------------------------------------------

const dryRun = process.argv.includes("--dry-run");

async function confirm(target) {
    if (dryRun || process.argv.includes("--yes")) return true;
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await prompt.question(`This deletes ALL data in ${target}, including every user, then reseeds it.\nType "reset" to continue: `);
    prompt.close();
    return answer.trim() === "reset";
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing. Run with: npm run db:reset");
const { hostname, pathname } = new URL(connectionString);
if (!(await confirm(`${hostname}${pathname}`))) {
    console.log("Cancelled. Nothing was changed.");
    process.exit(0);
}

client = new pg.Client({ connectionString });
await client.connect();
try {
    await client.query("BEGIN");
    // Every app table, found at run time so new tables are wiped without editing this file
    const { rows: tables } = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    await client.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
    console.log(`Wiped ${tables.length} tables.`);

    const ctx = { userIds: new Map() };
    for (const step of STEPS) await step(ctx);

    const counts = (await queryAll(tables.map(({ tablename }) => `SELECT count(*) FROM "${tablename}"`))).map((rows, i) => [tables[i].tablename, Number(rows[0].count)]);
    console.log("\nRows per table:");
    for (const [table, count] of counts) console.log(`  ${table.padEnd(22)} ${count}`);
    // Sessions and verifications are created by signing in, so they're expected to be empty
    const missing = counts.filter(([table, count]) => count === 0 && !["session", "verification"].includes(table));
    if (missing.length) console.log(`\nNo seed data for: ${missing.map(([table]) => table).join(", ")}. Add a step to scripts/seed.mjs.`);

    if (dryRun) {
        await client.query("ROLLBACK");
        console.log("\nDry run: rolled back, nothing was changed.");
        process.exit(0);
    }
    await client.query("COMMIT");
    console.log(`\nDone. Everyone was signed out.`);
    console.log(`Sign in with the Demo tab, or as any seeded user (e.g. ${ADMINS[1].email}) with password "${SHARED_PASSWORD}".`);
} catch (error) {
    await client.query("ROLLBACK");
    throw error;
} finally {
    await client.end();
}
