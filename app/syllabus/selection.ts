import { listSubjects } from "./queries";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Works out the selected level and subject from ?subject= (or ?level=).
 * Falls back to the first level and its first subject, so there's always something to show.
 */
export async function resolveSelection(params: SearchParams) {
    const subjects = await listSubjects();
    const levels = [...new Set(subjects.map((s) => s.level))];
    const requested = subjects.find((s) => s.id === params.subject);
    const level = requested?.level ?? (typeof params.level === "string" && levels.includes(params.level) ? params.level : levels[0]);
    const subject = requested ?? subjects.find((s) => s.level === level);
    return { subjects, levels, level, subject };
}

export type Selection = Awaited<ReturnType<typeof resolveSelection>>;
