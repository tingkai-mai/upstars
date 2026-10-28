"use client";
import { useRef, useState } from "react";
import { secondaryButtonClass } from "@/components/form";
import { formatLessonDate } from "./dates";
import { MAX_SCORE, REWARDS, totalScore } from "./rewards";
import type { PastCheckIn } from "./queries";

/**
 * One lesson at a time, newest first. Swipe or use the buttons to go back through older lessons.
 * The track runs right to left (row-reverse), so it starts on the newest lesson with no scroll-on-mount,
 * which wouldn't work anyway: the modal isn't shown yet when this mounts.
 */
export function PastCheckInsCarousel({ checkIns }: { checkIns: PastCheckIn[] }) {
    const trackRef = useRef<HTMLDivElement>(null);
    // 0 is the newest lesson
    const [index, setIndex] = useState(0);
    const isNewest = index === 0;
    const isOldest = index === checkIns.length - 1;

    function handleScroll() {
        const track = trackRef.current;
        // scrollLeft is 0 at the newest lesson and goes negative towards older ones
        if (track) setIndex(Math.min(checkIns.length - 1, Math.round(Math.abs(track.scrollLeft) / track.clientWidth)));
    }

    function go(direction: "older" | "newer") {
        const track = trackRef.current;
        track?.scrollBy({ left: direction === "older" ? -track.clientWidth : track.clientWidth, behavior: "smooth" });
    }

    return (
        <div className="flex flex-col gap-3">
            <div
                ref={trackRef}
                onScroll={handleScroll}
                role="region"
                aria-roledescription="carousel"
                aria-label="Past lessons"
                tabIndex={0}
                className="flex snap-x snap-mandatory flex-row-reverse items-start overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
            >
                {checkIns.map((c, i) => (
                    <article key={c.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${checkIns.length}`} className="w-full shrink-0 snap-center">
                        <CheckInCard checkIn={c} />
                    </article>
                ))}
            </div>

            {checkIns.length > 1 && (
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => go("older")} disabled={isOldest} className={`${secondaryButtonClass} disabled:opacity-40`}>
                        <span aria-hidden>‹</span>&nbsp;Older
                    </button>
                    <p className="flex-1 text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400" aria-live="polite">
                        {isNewest ? "Latest lesson" : `${index} ${index === 1 ? "lesson" : "lessons"} back`} · {index + 1}/{checkIns.length}
                    </p>
                    <button type="button" onClick={() => go("newer")} disabled={isNewest} className={`${secondaryButtonClass} disabled:opacity-40`}>
                        Newer&nbsp;<span aria-hidden>›</span>
                    </button>
                </div>
            )}
        </div>
    );
}

function CheckInCard({ checkIn }: { checkIn: PastCheckIn }) {
    return (
        <div className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-4 text-base dark:bg-zinc-900/60">
            <div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{formatLessonDate(checkIn.lessonDate)}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {checkIn.subject} · By {checkIn.recordedByName ?? "a former user"}
                </p>
            </div>
            <dl className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1 text-center sm:grid-cols-4 dark:bg-zinc-950">
                {REWARDS.map((r) => (
                    <div key={r.key} className="py-1">
                        <dt className="text-sm text-zinc-600 dark:text-zinc-400">{r.label}</dt>
                        <dd className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{checkIn.rewards[r.key]}</dd>
                    </div>
                ))}
                <div className="rounded-md bg-zinc-900 py-1 text-white dark:bg-zinc-50 dark:text-zinc-900">
                    <dt className="text-sm opacity-80">Score</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                        {totalScore(checkIn.rewards)}/{MAX_SCORE}
                    </dd>
                </div>
            </dl>
            <CoveredLine label="Concepts" names={checkIn.concepts} />
            <CoveredLine label="Worksheets" names={checkIn.worksheets} />
            <CoveredLine label="Tests" names={checkIn.tests} />
            <p className="whitespace-pre-line border-l-4 border-zinc-300 pl-3 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">{checkIn.remarks}</p>
        </div>
    );
}

function CoveredLine({ label, names }: { label: string; names: string[] }) {
    if (names.length === 0) return null;
    return (
        <p className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{label}:</span> {names.join(", ")}
        </p>
    );
}
