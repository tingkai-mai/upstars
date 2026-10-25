// Seeds the syllabus tables from seed_data/syllabus/*.csv. Safe to re-run:
// - a subject's chapters, weeks and concepts are only created when the subject is new
// - worksheets and tests are added when no item of that name exists yet; existing ones are never changed
// Usage: npm run db:seed:syllabus
import { readFileSync } from "node:fs";
import pg from "pg";

const DIR = new URL("../seed_data/syllabus/", import.meta.url);

/** Minimal RFC 4180 parser: handles quoted fields, escaped quotes and commas inside quotes. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const endField = () => {
        row.push(field);
        field = "";
    };
    const endRow = () => {
        endField();
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"') quoted = true;
        else if (char === ",") endField();
        else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i++;
            endRow();
        } else field += char;
    }
    if (field || row.length) endRow();
    const [header, ...body] = rows.filter((r) => r.some((cell) => cell !== ""));
    return body.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i]])));
}

const read = (name) => parseCsv(readFileSync(new URL(name, DIR), "utf8"));
const titleCase = (text) => text.replace(/\b\w/g, (letter) => letter.toUpperCase());

const subjects = read("subjects.csv");
const chapterWeeks = read("chapters.csv");
const concepts = read("concepts.csv");
const worksheetRows = read("worksheets.csv");
const testRows = read("tests.csv");

const conceptSource = new Map(concepts.map((c) => [c.concept_id, c])); // CSV concept_id → { week, concept }
const chapterOfWeek = new Map(chapterWeeks.map((row) => [`${row.subject_id}|${row.week}`, row.chapter]));

/** Groups CSV rows by a name column, keeping first-seen order. */
function groupBy(rows, key) {
    const groups = new Map();
    for (const row of rows) groups.set(row[key], [...(groups.get(row[key]) ?? []), row]);
    return groups;
}

/**
 * The CSVs split an item's time evenly across its concepts; we store the total. Splits were
 * rounded to 2 dp (e.g. 7 × 7.14 = 49.98), so round the sum to whole minutes. Blank → not set.
 */
function totalMinutes(rows) {
    if (rows.some((row) => !row.duration_min?.trim())) return null;
    return Math.round(rows.reduce((sum, row) => sum + Number(row.duration_min), 0));
}

async function createSubjectPlan(subjectId, source) {
    const weeksForSubject = chapterWeeks.filter((row) => row.subject_id === source.subject_id).sort((a, b) => a.week - b.week);
    // Chapters, in order of their first week
    const chapterIds = new Map();
    for (const { chapter } of weeksForSubject) {
        if (chapterIds.has(chapter)) continue;
        const { rows } = await client.query(`INSERT INTO chapter (subject_id, name) VALUES ($1, $2) RETURNING id`, [subjectId, chapter]);
        chapterIds.set(chapter, rows[0].id);
    }
    const weekIds = new Map();
    for (const row of weeksForSubject) {
        const { rows } = await client.query(`INSERT INTO week (subject_id, chapter_id, number, duration_min) VALUES ($1, $2, $3, $4) RETURNING id`, [
            subjectId,
            chapterIds.get(row.chapter),
            Number(row.week),
            Math.round(Number(row.duration_min)),
        ]);
        weekIds.set(row.week, rows[0].id);
    }
    // Concepts keep their CSV order within each week
    const positions = new Map();
    for (const row of concepts.filter((c) => weekIds.has(c.week))) {
        const position = (positions.get(row.week) ?? 0) + 1;
        positions.set(row.week, position);
        await client.query(`INSERT INTO concept (week_id, name, position) VALUES ($1, $2, $3)`, [weekIds.get(row.week), row.concept, position]);
    }
    console.log(`  created ${chapterIds.size} chapters, ${weekIds.size} weeks, ${concepts.filter((c) => weekIds.has(c.week)).length} concepts`);
}

/** Maps CSV concept_ids to database concept ids by (week number, concept name). */
async function conceptIdLookup(subjectId) {
    const { rows } = await client.query(`SELECT c.id, c.name, w.number FROM concept c JOIN week w ON w.id = c.week_id WHERE w.subject_id = $1`, [subjectId]);
    const byKey = new Map(rows.map((r) => [`${r.number}|${r.name}`, r.id]));
    return (csvConceptId) => {
        const source = conceptSource.get(csvConceptId);
        return source && byKey.get(`${source.week}|${source.concept}`);
    };
}

async function syncWorksheets(subjectId, conceptIdFor) {
    let added = 0;
    for (const [name, rows] of groupBy(worksheetRows, "worksheet_name")) {
        const conceptIds = rows.map((row) => conceptIdFor(row.concept_id)).filter(Boolean);
        if (conceptIds.length !== rows.length) {
            console.warn(`  ! worksheet "${name}": ${rows.length - conceptIds.length} concept(s) not found (renamed in the app?), skipped`);
            continue;
        }
        const { rows: inserted } = await client.query(
            `INSERT INTO worksheet (subject_id, name, duration_min) VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT worksheet_subject_name_unique DO NOTHING RETURNING id`,
            [subjectId, name, totalMinutes(rows)],
        );
        if (inserted.length === 0) continue;
        await client.query(`INSERT INTO worksheet_concept (worksheet_id, concept_id) SELECT $1, unnest($2::uuid[])`, [inserted[0].id, conceptIds]);
        added++;
    }
    return added;
}

async function syncTests(subjectId, source) {
    const { rows: chapters } = await client.query(`SELECT id, name FROM chapter WHERE subject_id = $1`, [subjectId]);
    const chapterIdByName = new Map(chapters.map((c) => [c.name, c.id]));
    let added = 0;
    for (const [name, rows] of groupBy(testRows, "test_name")) {
        // Tests cover whole chapters: take the chapters of the listed concepts
        const chapterNames = [...new Set(rows.map((row) => chapterOfWeek.get(`${source.subject_id}|${conceptSource.get(row.concept_id)?.week}`)))];
        const chapterIds = chapterNames.map((chapter) => chapterIdByName.get(chapter));
        if (chapterIds.some((id) => !id)) {
            console.warn(`  ! test "${name}": chapter not found (renamed in the app?), skipped`);
            continue;
        }
        const type = /monthly/i.test(name) ? "monthly" : "capstone";
        const { rows: inserted } = await client.query(
            `INSERT INTO test (subject_id, name, type, duration_min) VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT test_subject_name_unique DO NOTHING RETURNING id`,
            [subjectId, name, type, totalMinutes(rows)],
        );
        if (inserted.length === 0) continue;
        await client.query(`INSERT INTO test_chapter (test_id, chapter_id) SELECT $1, unnest($2::uuid[])`, [inserted[0].id, chapterIds]);
        added++;
    }
    return added;
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
    await client.query("BEGIN");
    for (const source of subjects) {
        const level = source.level.toUpperCase();
        const name = titleCase(source.subject);
        console.log(`${level} ${name}`);
        const { rows: inserted } = await client.query(
            `INSERT INTO subject (level, name) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT subject_level_name_unique DO NOTHING RETURNING id`,
            [level, name],
        );
        let subjectId = inserted[0]?.id;
        if (subjectId) await createSubjectPlan(subjectId, source);
        else {
            subjectId = (await client.query(`SELECT id FROM subject WHERE level = $1 AND name = $2`, [level, name])).rows[0].id;
            console.log("  subject exists: keeping its chapters, weeks and concepts");
        }
        const worksheets = await syncWorksheets(subjectId, await conceptIdLookup(subjectId));
        const tests = await syncTests(subjectId, source);
        console.log(`  added ${worksheets} worksheets, ${tests} tests`);
    }
    await client.query("COMMIT");
} catch (error) {
    await client.query("ROLLBACK");
    throw error;
} finally {
    await client.end();
}
