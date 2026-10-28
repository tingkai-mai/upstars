"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { compactPrimaryButtonClass, dangerButtonClass, Field, FormError, inputClass, selectClass, selectStyle } from "@/components/form";
import { ChevronRightIcon } from "@/components/icons";
import { FormDialog } from "@/components/form-dialog";
import { createPairing, removePairing, type PairingState } from "../actions";
import type { Pairing, Person } from "../queries";

/** "New pairing" button and modal, for admins. Only students without a tutor can be chosen. */
export function NewPairingButton({ tutors, students }: { tutors: Person[]; students: Person[] }) {
    return (
        <FormDialog
            title="New pairing"
            trigger="New pairing"
            triggerLabel="New pairing"
            triggerClassName={compactPrimaryButtonClass}
            submitLabel="Add pairing"
            action={createPairing.bind(null, {})}
        >
            <PersonSelect label="Tutor" name="tutorId" people={tutors} emptyLabel="No tutors yet" />
            <p className="rounded-xl bg-zinc-100 p-3 text-base text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                Each student has one main tutor, so only students without a tutor are listed. To change a student&apos;s tutor, unpair them first.
            </p>
            <PersonSelect label="Student" name="studentId" people={students} emptyLabel="Every student already has a tutor" />
            <p className="text-base text-zinc-600 dark:text-zinc-400">
                Someone missing?{" "}
                <Link href="/volunteers/new" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
                    Add a new user
                </Link>{" "}
                (this closes the form).
            </p>
        </FormDialog>
    );
}

type PersonSelectProps = { label: string; name: string; people: Person[]; emptyLabel: string };

// Uncontrolled: FormDialog keeps the choice after an error and starts fresh each time it opens
function PersonSelect({ label, name, people, emptyLabel }: PersonSelectProps) {
    return (
        <Field label={label} htmlFor={name}>
            <select id={name} name={name} required defaultValue="" className={selectClass} style={selectStyle}>
                <option value="" disabled>
                    {people.length ? `Choose a ${label.toLowerCase()}…` : emptyLabel}
                </option>
                {people.map((person) => (
                    <option key={person.id} value={person.id}>
                        {person.name} ({person.email})
                    </option>
                ))}
            </select>
        </Field>
    );
}

function matches(person: Person, query: string) {
    return person.name.toLowerCase().includes(query) || person.email.toLowerCase().includes(query);
}

type TutorGroup = { tutor: Person; students: Person[] };

/** One group per tutor, in the order tutors first appear. */
function groupByTutor(pairings: Pairing[]): TutorGroup[] {
    const groups = new Map<string, TutorGroup>();
    for (const { tutor, student } of pairings) {
        const group = groups.get(tutor.id) ?? { tutor, students: [] };
        group.students.push(student);
        groups.set(tutor.id, group);
    }
    return [...groups.values()];
}

export function PairingList({ pairings, initialQuery, canEdit }: { pairings: Pairing[]; initialQuery: string; canEdit: boolean }) {
    const [query, setQuery] = useState(initialQuery);
    const normalized = query.trim().toLowerCase();
    const visible = normalized ? pairings.filter((p) => matches(p.tutor, normalized) || matches(p.student, normalized)) : pairings;

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Field label="Find a tutor or student" htmlFor="pairing-filter">
                    <input
                        id="pairing-filter"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Type a name or email"
                        autoComplete="off"
                        className={inputClass}
                    />
                </Field>
                <p className="text-base text-zinc-600 dark:text-zinc-400" aria-live="polite">
                    {normalized ? `Showing ${visible.length} of ${pairings.length} pairings` : `${pairings.length} ${pairings.length === 1 ? "pairing" : "pairings"}`}
                </p>
            </div>

            {visible.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center text-base text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                    {pairings.length === 0 ? `No pairings yet.${canEdit ? " Add one with New pairing." : ""}` : "No pairings match your search."}
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {groupByTutor(visible).map(({ tutor, students }) => (
                        <li key={tutor.id} className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <PersonLink person={tutor} role="Tutor" className="bg-zinc-50 dark:bg-zinc-900" />
                            <ul className="divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                                {students.map((student) => (
                                    <PairingRow key={student.id} tutor={tutor} student={student} canEdit={canEdit} />
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function PairingRow({ tutor, student, canEdit }: { tutor: Person; student: Person; canEdit: boolean }) {
    const [state, formAction, pending] = useActionState<PairingState>(removePairing.bind(null, tutor.id, student.id), {});

    return (
        <li className="flex flex-col">
            <div className="flex items-center gap-2 pr-3">
                <PersonLink person={student} role="Student" className="min-w-0 flex-1" />
                {canEdit && (
                    <form
                        action={formAction}
                        onSubmit={(event) => {
                            if (!confirm(`Unpair ${student.name} from ${tutor.name}?`)) event.preventDefault();
                        }}
                    >
                        <button type="submit" disabled={pending} aria-label={`Unpair ${student.name} from ${tutor.name}`} className={`${dangerButtonClass} h-11 w-auto px-4`}>
                            {pending ? "Removing…" : "Unpair"}
                        </button>
                    </form>
                )}
            </div>
            {state.error && (
                <div className="px-4 pb-3">
                    <FormError message={state.error} />
                </div>
            )}
        </li>
    );
}

/** A full-width row opening the person's profile. */
function PersonLink({ person, role, className = "" }: { person: Person; role: string; className?: string }) {
    return (
        <Link href={`/volunteers/${person.id}`} className={`flex min-h-14 items-center gap-3 px-4 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className}`}>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">{role}</span>
                <span className="block truncate text-lg font-medium text-zinc-900 dark:text-zinc-50">{person.name}</span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
                <ChevronRightIcon />
            </span>
        </Link>
    );
}
