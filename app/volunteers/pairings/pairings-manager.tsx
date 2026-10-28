"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { compactPrimaryButtonClass, Field, FormError, inputClass, selectClass, selectStyle } from "@/components/form";
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
            <PersonSelect label="Student" name="studentId" people={students} emptyLabel="Every student already has a tutor" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Each student has one main tutor, so students who already have one aren&apos;t listed.{" "}
                <Link href="/volunteers/new" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
                    Add a user
                </Link>
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

export function PairingList({ pairings, initialQuery, canEdit }: { pairings: Pairing[]; initialQuery: string; canEdit: boolean }) {
    const [query, setQuery] = useState(initialQuery);
    const normalized = query.trim().toLowerCase();
    const visible = normalized ? pairings.filter((p) => matches(p.tutor, normalized) || matches(p.student, normalized)) : pairings;

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <label htmlFor="pairing-filter" className="sr-only">
                    Filter pairings
                </label>
                <input
                    id="pairing-filter"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter by tutor or student"
                    autoComplete="off"
                    className={inputClass}
                />
                <p className="text-base text-zinc-600 dark:text-zinc-400" aria-live="polite">
                    {normalized ? `${visible.length} of ${pairings.length} pairings` : `${pairings.length} ${pairings.length === 1 ? "pairing" : "pairings"}`}
                </p>
            </div>

            {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-base text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                    {pairings.length === 0 ? `No pairings yet.${canEdit ? " Add one with New pairing." : ""}` : "No pairings match your filter."}
                </p>
            ) : (
                <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {visible.map((p) => (
                        <PairingRow key={`${p.tutor.id}:${p.student.id}`} pairing={p} canEdit={canEdit} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function PairingRow({ pairing, canEdit }: { pairing: Pairing; canEdit: boolean }) {
    const { tutor, student } = pairing;
    const [state, formAction, pending] = useActionState<PairingState>(removePairing.bind(null, tutor.id, student.id), {});

    return (
        <li className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-3">
                <dl className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <PersonCell role="Tutor" person={tutor} />
                    <PersonCell role="Student" person={student} />
                </dl>
                {canEdit && (
                    <form
                        action={formAction}
                        onSubmit={(event) => {
                            if (!confirm(`Remove the pairing between ${tutor.name} and ${student.name}?`)) event.preventDefault();
                        }}
                    >
                        <button
                            type="submit"
                            disabled={pending}
                            className="h-11 shrink-0 rounded-xl px-3 text-base font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/50"
                        >
                            {pending ? "Removing…" : "Remove"}
                        </button>
                    </form>
                )}
            </div>
            <FormError message={state.error} />
        </li>
    );
}

function PersonCell({ role, person }: { role: string; person: Person }) {
    return (
        <div className="min-w-0">
            <dt className="text-sm font-medium text-zinc-600">{role}</dt>
            <dd className="truncate">
                <Link href={`/volunteers/${person.id}`} className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50">
                    {person.name}
                </Link>
            </dd>
        </div>
    );
}
