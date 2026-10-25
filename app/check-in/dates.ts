export const MAX_REMARKS_LENGTH = 2_000;

/** Today's date as YYYY-MM-DD in Singapore, where Upstars operates. */
export function todayInSingapore() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

/** "2026-10-25" → "25 Oct 2026" */
export function formatLessonDate(isoDate: string) {
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
