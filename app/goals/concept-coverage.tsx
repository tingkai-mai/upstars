"use client";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { pluralize } from "@/lib/format";
import { formatLessonDate } from "@/app/check-in/dates";
import type { ConceptLesson } from "@/app/check-in/queries";
import { formatCompletedOn } from "./completion-table";

type Props = {
    conceptName: string;
    /** Check-ins that covered the concept, oldest first */
    lessons: ConceptLesson[];
    /** When it was marked done, from a check-in or the Done tick-box */
    completedAt?: Date;
};

/** "2026-10-24" → "24 Oct" */
function shortDate(isoDate: string) {
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** When the concept was first taught, opening the lessons that taught it. Nothing if it never was. */
export function ConceptCoverage({ conceptName, lessons, completedAt }: Props) {
    const [open, setOpen] = useState(false);
    if (lessons.length === 0 && !completedAt) return null;

    // Ticked done by hand, with no check-in behind it
    const label = lessons.length ? `Taught ${shortDate(lessons[0].lessonDate)}` : "No lesson recorded";

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`When ${conceptName} was covered`}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-base font-medium whitespace-nowrap text-emerald-800 tabular-nums transition hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
            >
                {label}
                {lessons.length > 1 && <span className="font-normal">· {lessons.length} lessons</span>}
                <span aria-hidden>›</span>
            </button>
            {open && (
                <Modal title={conceptName} onClose={() => setOpen(false)} closeLabel="Close">
                    <p className="-mt-2 text-base text-zinc-600 dark:text-zinc-400">
                        {lessons.length ? `Taught in ${pluralize(lessons.length, "lesson")}` : "Not taught in a checked-in lesson"}
                        {completedAt && ` · ticked done on ${formatCompletedOn(completedAt)}`}
                    </p>
                    {lessons.length > 0 && (
                        <ol className="flex flex-col gap-2">
                            {lessons.map((lesson) => (
                                <li key={lesson.checkInId} className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-3 text-base dark:bg-zinc-900/60">
                                    <p className="flex flex-wrap justify-between gap-x-3">
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{formatLessonDate(lesson.lessonDate)}</span>
                                        <span className="text-zinc-600 dark:text-zinc-400">By {lesson.recordedByName ?? "a former user"}</span>
                                    </p>
                                    <p className="whitespace-pre-line border-l-4 border-zinc-300 pl-3 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">{lesson.remarks}</p>
                                </li>
                            ))}
                        </ol>
                    )}
                </Modal>
            )}
        </>
    );
}
