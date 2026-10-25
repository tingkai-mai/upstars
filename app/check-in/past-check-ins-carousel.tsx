"use client";
import { useRef, useState } from "react";
import { secondaryButtonClass } from "@/components/form";
import { formatLessonDate } from "./dates";
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
                    <p className="flex-1 text-center text-xs tabular-nums text-zinc-500 dark:text-zinc-400" aria-live="polite">
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
        <div className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-900/60">
            <div>
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{formatLessonDate(checkIn.lessonDate)}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {checkIn.subject} · By {checkIn.recordedByName ?? "a former user"}
                </p>
            </div>
            <CoveredLine label="Concepts" names={checkIn.concepts} />
            <CoveredLine label="Worksheets" names={checkIn.worksheets} />
            <CoveredLine label="Tests" names={checkIn.tests} />
            <p className="whitespace-pre-line text-zinc-600 italic dark:text-zinc-300">“{checkIn.remarks}”</p>
        </div>
    );
}

function CoveredLine({ label, names }: { label: string; names: string[] }) {
    if (names.length === 0) return null;
    return (
        <p className="text-zinc-700 dark:text-zinc-300">
            <span className="text-zinc-500 dark:text-zinc-400">{label}:</span> {names.join(", ")}
        </p>
    );
}
