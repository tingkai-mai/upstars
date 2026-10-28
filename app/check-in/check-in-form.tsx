"use client";
import { useId, useState, useTransition, type ReactNode, type SubmitEvent } from "react";
import { Field, FormError, inputClass, textareaClass } from "@/components/form";
import { CheckIcon } from "@/components/icons";
import { pluralize } from "@/lib/format";
import type { Chapter } from "@/app/syllabus/queries";
import { ChapterPicker, DoneTag } from "@/app/syllabus/worksheets/worksheet-builder";
import { useOnCheckInSaved } from "./check-in-dialog";
import { formatLessonDate, MAX_REMARKS_LENGTH } from "./dates";
import { formatRewards, MAX_POINTS_PER_REWARD, MAX_SCORE, REWARDS, totalScore, type RewardKey, type RewardPoints } from "./rewards";

type Item = { id: string; name: string; detail?: string; done: boolean };
type TabKey = "concepts" | "worksheets" | "tests" | "rewards" | "remarks";

const POINT_OPTIONS = Array.from({ length: MAX_POINTS_PER_REWARD + 1 }, (_, points) => points);

type Props = {
    studentName: string;
    subjectName: string;
    chapters: Chapter[];
    doneConceptIds: string[];
    worksheets: Item[];
    tests: Item[];
    today: string;
    action: (formData: FormData) => Promise<{ error?: string }>;
};

/** Ticks off what a lesson covered, one tab per kind of item, with Save pinned to the bottom of the modal. */
export function CheckInForm({ studentName, subjectName, chapters, doneConceptIds, worksheets, tests, today, action }: Props) {
    const onSaved = useOnCheckInSaved();
    // Concept, worksheet and test ids are all UUIDs, so one set holds every tick
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const [rewards, setRewards] = useState<Partial<RewardPoints>>({});
    const [remarks, setRemarks] = useState("");
    const [tab, setTab] = useState<TabKey>("concepts");
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const tabsId = useId();

    const doneConcepts = new Set(doneConceptIds);
    // Open the chapter the student is up to: the first with a concept not yet done
    const currentChapterId = chapters.find((c) => c.weeks.some((w) => w.concepts.some((concept) => !doneConcepts.has(concept.id))))?.id;
    const worksheetCount = worksheets.filter((w) => selected.has(w.id)).length;
    const testCount = tests.filter((t) => selected.has(t.id)).length;
    const conceptCount = selected.size - worksheetCount - testCount;
    // Undefined until every reward has points
    const chosenRewards = REWARDS.every((r) => rewards[r.key] !== undefined) ? (rewards as RewardPoints) : undefined;
    const score = chosenRewards && totalScore(chosenRewards);

    function toggle(ids: string[], checked: boolean) {
        setSelected((current) => {
            const next = new Set(current);
            for (const id of ids) {
                if (checked) next.add(id);
                else next.delete(id);
            }
            return next;
        });
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        // Checked here rather than with `required`: the browser can't point at a field in a hidden tab
        if (!chosenRewards) {
            setTab("rewards");
            setError("Choose points for each reward before checking in.");
            return;
        }
        if (!remarks.trim()) {
            setTab("remarks");
            setError("Add remarks about the lesson before checking in.");
            return;
        }
        const formData = new FormData(event.currentTarget);
        setError(undefined);
        startTransition(async () => {
            const result = await action(formData);
            // State updates after an await must be wrapped again to stay in the transition
            startTransition(() => {
                if (result.error) {
                    setError(result.error);
                    return;
                }
                const lessonDate = formatLessonDate(String(formData.get("lessonDate")));
                onSaved({
                    message: `Checked in ${studentName}'s lesson on ${lessonDate}.`,
                    shareText: `Lesson check-in: ${studentName}\n${lessonDate} · ${subjectName}\n${formatRewards(chosenRewards)}\n\n${remarks.trim()}`,
                });
            });
        });
    }

    const tabs: { key: TabKey; label: string; badge?: number | boolean }[] = [
        { key: "concepts", label: "Concepts", badge: conceptCount },
        { key: "worksheets", label: "Worksheets", badge: worksheetCount },
        { key: "tests", label: "Tests", badge: testCount },
        { key: "rewards", label: "Rewards", badge: Boolean(chosenRewards) },
        { key: "remarks", label: "Remarks", badge: remarks.trim() !== "" },
    ];
    const summary = [
        pluralize(conceptCount, "concept"),
        pluralize(worksheetCount, "worksheet"),
        pluralize(testCount, "test"),
        ...(score === undefined ? [] : [`score ${score}/${MAX_SCORE}`]),
    ].join(" · ");

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Lesson date" htmlFor="lessonDate">
                <input id="lessonDate" name="lessonDate" type="date" required max={today} defaultValue={today} className={inputClass} />
            </Field>

            {/* Two rows on phones (what was covered, then rewards and remarks), one row on larger screens */}
            <div role="tablist" aria-label="What was covered" className="grid grid-cols-6 gap-1 rounded-xl bg-zinc-100 p-1 sm:grid-cols-5 dark:bg-zinc-900">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        id={`${tabsId}-${t.key}-tab`}
                        aria-selected={tab === t.key}
                        aria-controls={`${tabsId}-${t.key}`}
                        onClick={() => setTab(t.key)}
                        className={`flex h-12 items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-medium transition sm:col-span-1 sm:text-base ${t.key === "rewards" || t.key === "remarks" ? "col-span-3" : "col-span-2"} ${
                            tab === t.key ? "bg-white font-semibold text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        }`}
                    >
                        {t.label}
                        <TabBadge value={t.badge} />
                    </button>
                ))}
            </div>

            {/* Inactive panels are hidden, not unmounted, so their ticks are still submitted */}
            <TabPanel id={`${tabsId}-concepts`} active={tab === "concepts"}>
                {chapters.every((c) => c.weeks.every((w) => w.concepts.length === 0)) && <EmptyTab>This subject has no concepts yet.</EmptyTab>}
                {chapters.map((chapter) => (
                    <ChapterPicker key={chapter.id} chapter={chapter} selected={selected} onToggle={toggle} doneIds={doneConcepts} defaultOpen={chapter.id === currentChapterId} />
                ))}
            </TabPanel>
            <TabPanel id={`${tabsId}-worksheets`} active={tab === "worksheets"}>
                <ItemChecklist name="worksheetId" items={worksheets} selected={selected} onToggle={toggle} empty="This subject has no worksheets yet." />
            </TabPanel>
            <TabPanel id={`${tabsId}-tests`} active={tab === "tests"}>
                <ItemChecklist name="testId" items={tests} selected={selected} onToggle={toggle} empty="This subject has no tests yet." />
            </TabPanel>
            <TabPanel id={`${tabsId}-rewards`} active={tab === "rewards"}>
                {REWARDS.map((reward) => (
                    <PointsPicker
                        key={reward.key}
                        name={reward.key}
                        label={`${reward.label} points`}
                        value={rewards[reward.key]}
                        onChange={(points) => setRewards((current) => ({ ...current, [reward.key]: points }))}
                    />
                ))}
                <p className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3 text-white dark:bg-zinc-50 dark:text-zinc-900">
                    <span className="text-base font-medium">Score</span>
                    <span className="text-2xl font-semibold tabular-nums">
                        {score ?? "–"}
                        <span className="text-base font-normal opacity-60">/{MAX_SCORE}</span>
                    </span>
                </p>
            </TabPanel>
            <TabPanel id={`${tabsId}-remarks`} active={tab === "remarks"}>
                <label htmlFor="remarks" className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                    Remarks <span className="font-normal text-zinc-600 dark:text-zinc-400">· required, you can share them on WhatsApp next</span>
                </label>
                <textarea
                    id="remarks"
                    name="remarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    maxLength={MAX_REMARKS_LENGTH}
                    rows={6}
                    placeholder="How did the lesson go? Anything to follow up on?"
                    className={textareaClass}
                />
            </TabPanel>

            <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-3 border-t border-zinc-200 bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6 dark:border-zinc-800 dark:bg-zinc-950">
                <FormError message={error} />
                <div className="flex items-center gap-3">
                    <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
                        {summary}
                    </p>
                    <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 px-5 text-base font-medium text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        {pending ? "Saving…" : "Check in"}
                    </button>
                </div>
            </div>
        </form>
    );
}

function TabBadge({ value }: { value?: number | boolean }) {
    if (!value) return null;
    if (value === true) {
        return (
            <span className="text-emerald-600 dark:text-emerald-400">
                <CheckIcon />
                <span className="sr-only">(filled in)</span>
            </span>
        );
    }
    return <span className="min-w-5 rounded-full bg-emerald-600 px-1.5 text-center text-sm leading-5 font-semibold tabular-nums text-white">{value}</span>;
}

type PointsPickerProps = { name: RewardKey; label: string; value?: number; onChange: (points: number) => void };

/** Radio buttons drawn as a 0–2 segmented control. */
function PointsPicker({ name, label, value, onChange }: PointsPickerProps) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base font-medium text-zinc-800 dark:text-zinc-200">{label}</legend>
            <div className="grid grid-cols-3 gap-2">
                {POINT_OPTIONS.map((points) => (
                    <label
                        key={points}
                        className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 text-lg font-semibold tabular-nums text-zinc-700 transition has-checked:border-zinc-900 has-checked:bg-zinc-900 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-zinc-900/20 dark:border-zinc-700 dark:text-zinc-300 dark:has-checked:border-zinc-50 dark:has-checked:bg-zinc-50 dark:has-checked:text-zinc-900"
                    >
                        <input type="radio" name={name} value={points} checked={value === points} onChange={() => onChange(points)} className="sr-only" />
                        {points}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

// A minimum height stops the modal jumping as tabs switch
function TabPanel({ id, active, children }: { id: string; active: boolean; children: ReactNode }) {
    return (
        <div role="tabpanel" id={id} aria-labelledby={`${id}-tab`} hidden={!active} className="flex min-h-64 flex-col gap-3">
            {children}
        </div>
    );
}

function EmptyTab({ children }: { children: ReactNode }) {
    return <p className="py-8 text-center text-base text-zinc-600 dark:text-zinc-400">{children}</p>;
}

type ChecklistProps = { name: string; items: Item[]; selected: Set<string>; onToggle: (ids: string[], checked: boolean) => void; empty: string };

function ItemChecklist({ name, items, selected, onToggle, empty }: ChecklistProps) {
    if (items.length === 0) return <EmptyTab>{empty}</EmptyTab>;
    return (
        <ul className="flex flex-col rounded-2xl border border-zinc-200 px-3 py-1 dark:border-zinc-800">
            {items.map((item) => (
                <li key={item.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1.5 text-base text-zinc-800 dark:text-zinc-200">
                        <input
                            type="checkbox"
                            name={name}
                            value={item.id}
                            checked={selected.has(item.id)}
                            onChange={(event) => onToggle([item.id], event.target.checked)}
                            className="size-6 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                        />
                        <span className="min-w-0 flex-1">
                            {item.name}
                            {item.detail && <span className="block text-sm text-zinc-600 dark:text-zinc-400">{item.detail}</span>}
                        </span>
                        {item.done && <DoneTag />}
                    </label>
                </li>
            ))}
        </ul>
    );
}
