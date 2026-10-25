"use client";
import { useEffect, useState, useTransition, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { FormError, inputClass, secondaryButtonClass, selectClass, selectStyle } from "@/components/form";
import { PenIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { pluralize } from "@/lib/format";
import { createSubject, deleteSubject, updateSubject } from "./actions";

type Subject = { id: string; level: string; name: string; weekCount: number };

const smallPrimaryClass =
    "inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
const smallInputClass = inputClass.replace("h-12", "h-10").replace("text-base", "text-sm");

export function ManageSubjects({ subjects }: { subjects: Subject[] }) {
    const [open, setOpen] = useState(false);

    // Close if Next hides this page (it keeps visited pages alive)
    useEffect(() => () => setOpen(false), []);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={`${secondaryButtonClass} gap-2`}>
                <PenIcon />
                Manage subjects
            </button>
            {open && <SubjectsModal subjects={subjects} onClose={() => setOpen(false)} />}
        </>
    );
}

function SubjectsModal({ subjects, onClose }: { subjects: Subject[]; onClose: () => void }) {
    const router = useRouter();
    const [editingId, setEditingId] = useState<string>();
    const levels = [...new Set(subjects.map((s) => s.level))];

    function openSubject(id: string) {
        onClose();
        router.push(`/syllabus?subject=${id}`);
    }

    return (
        <Modal title="Levels & subjects" onClose={onClose} closeLabel="Close">

            <div className="-mx-5 flex max-h-[50dvh] flex-col gap-5 overflow-y-auto px-5 sm:-mx-6 sm:px-6">
                {levels.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No subjects yet. Add the first one below.</p>}
                {levels.map((level) => (
                    <section key={level} className="flex flex-col gap-2">
                        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{level}</h3>
                        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                            {subjects
                                .filter((s) => s.level === level)
                                .map((s) =>
                                    s.id === editingId ? (
                                        <EditSubjectRow key={s.id} subject={s} levels={levels} onDone={() => setEditingId(undefined)} />
                                    ) : (
                                        <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                                            <button type="button" onClick={() => openSubject(s.id)} className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                                <span className="block truncate font-medium">{s.name}</span>
                                                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{pluralize(s.weekCount, "week")}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingId(s.id)}
                                                aria-label={`Edit ${s.level} ${s.name}`}
                                                className="inline-flex h-9 shrink-0 items-center rounded-lg px-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                                            >
                                                Edit
                                            </button>
                                        </li>
                                    ),
                                )}
                        </ul>
                    </section>
                ))}
            </div>

            <AddSubjectForm levels={levels} />
        </Modal>
    );
}

function useSubjectAction() {
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    function run(work: () => Promise<{ error?: string }>, onSuccess: () => void) {
        setError(undefined);
        startTransition(async () => {
            const result = await work();
            if (result.error) setError(result.error);
            else onSuccess();
        });
    }
    return { error, pending, run };
}

const NEW_LEVEL = "__new__";

function SubjectInputs({ levels, defaults }: { levels: string[]; defaults?: { level: string; name: string } }) {
    return (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <LevelPicker levels={levels} defaultLevel={defaults?.level} />
            <input name="name" aria-label="Subject" placeholder="Subject" required autoComplete="off" defaultValue={defaults?.name} className={smallInputClass} />
        </div>
    );
}

/**
 * Pick an existing level, or choose "New level…" to type one.
 * A plain select rather than <datalist>: Chrome draws datalist suggestions in the wrong place inside a modal dialog.
 */
function LevelPicker({ levels, defaultLevel }: { levels: string[]; defaultLevel?: string }) {
    const [level, setLevel] = useState(defaultLevel ?? levels[0] ?? "");
    const [typing, setTyping] = useState(levels.length === 0);

    if (typing) {
        return (
            <div className="relative">
                <input name="level" aria-label="New level" placeholder="New level, e.g. P5" required autoComplete="off" autoFocus={levels.length > 0} className={`${smallInputClass} ${levels.length ? "pr-9" : ""}`} />
                {levels.length > 0 && (
                    <button type="button" onClick={() => setTyping(false)} aria-label="Choose an existing level" className="absolute inset-y-0 right-0 px-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
                        ×
                    </button>
                )}
            </div>
        );
    }

    return (
        <select
            name="level"
            aria-label="Level"
            value={level}
            onChange={(event) => (event.target.value === NEW_LEVEL ? setTyping(true) : setLevel(event.target.value))}
            className={selectClass.replace("h-12", "h-10").replace("text-base", "text-sm")}
            style={selectStyle}
        >
            {levels.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
            <option value={NEW_LEVEL}>+ New level…</option>
        </select>
    );
}

function AddSubjectForm({ levels }: { levels: string[] }) {
    const { error, pending, run } = useSubjectAction();
    // After each add, remount the inputs: clears the name and returns to the level list, keeping the level just used
    const [added, setAdded] = useState({ count: 0, level: undefined as string | undefined });

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const level = String(formData.get("level") ?? "").trim();
        run(() => createSubject(formData), () => setAdded((previous) => ({ count: previous.count + 1, level })));
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <h3 className="text-sm font-medium">Add subject</h3>
            <SubjectInputs key={added.count} levels={levels} defaults={added.level ? { level: added.level, name: "" } : undefined} />
            <FormError message={error} />
            <button type="submit" disabled={pending} className={smallPrimaryClass}>
                {pending ? "Adding…" : "Add subject"}
            </button>
        </form>
    );
}

function EditSubjectRow({ subject, levels, onDone }: { subject: Subject; levels: string[]; onDone: () => void }) {
    const { error, pending, run } = useSubjectAction();

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        run(() => updateSubject(subject.id, formData), onDone);
    }

    function handleDelete() {
        const message = `Delete ${subject.level} ${subject.name}? All of its chapters, weeks, concepts and worksheets will be deleted. This can't be undone.`;
        if (confirm(message)) run(() => deleteSubject(subject.id), onDone);
    }

    return (
        <li className="bg-zinc-50 p-3 dark:bg-zinc-900/60">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <SubjectInputs levels={levels} defaults={subject} />
                <FormError message={error} />
                <div className="flex flex-wrap items-center gap-2">
                    <button type="submit" disabled={pending} className={smallPrimaryClass}>
                        {pending ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={onDone} disabled={pending} className={secondaryButtonClass}>
                        Cancel
                    </button>
                    <button type="button" onClick={handleDelete} disabled={pending} className="ml-auto inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/50">
                        Delete
                    </button>
                </div>
            </form>
        </li>
    );
}

