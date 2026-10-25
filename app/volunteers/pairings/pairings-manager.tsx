"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Field, FormError, inputClass, primaryButtonClass, selectClass, selectStyle } from "@/components/form";
import { createPairing, removePairing, type PairingState } from "../actions";
import type { Pairing, Person } from "../queries";
import { submitWithoutReset } from "@/lib/submit-without-reset";

export function AddPairingForm({ tutors, students }: { tutors: Person[]; students: Person[] }) {
    // Controlled so the choice survives an error and can be cleared after a success
    const [tutorId, setTutorId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [state, dispatch, pending] = useActionState(async (prev: PairingState, formData: FormData) => {
        const result = await createPairing(prev, formData);
        if (result.success) {
            setTutorId("");
            setStudentId("");
        }
        return result;
    }, {});

    if (tutors.length === 0 || students.length === 0) {
        return (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                You need at least one tutor and one student to create a pairing.{" "}
                <Link href="/volunteers/new" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
                    Add a user
                </Link>
            </p>
        );
    }

    return (
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">New pairing</h2>
            <form onSubmit={submitWithoutReset(dispatch)} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <PersonSelect label="Tutor" name="tutorId" people={tutors} value={tutorId} onChange={setTutorId} />
                    <PersonSelect label="Student" name="studentId" people={students} value={studentId} onChange={setStudentId} />
                </div>
                <FormError message={state.error} />
                {state.success && (
                    <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {state.success}
                    </p>
                )}
                <button type="submit" disabled={pending} className={primaryButtonClass}>
                    {pending ? "Adding…" : "Add pairing"}
                </button>
            </form>
        </section>
    );
}

type PersonSelectProps = { label: string; name: string; people: Person[]; value: string; onChange: (id: string) => void };

function PersonSelect({ label, name, people, value, onChange }: PersonSelectProps) {
    return (
        <Field label={label} htmlFor={name}>
            <select id={name} name={name} required value={value} onChange={(event) => onChange(event.target.value)} className={selectClass} style={selectStyle}>
                <option value="" disabled>
                    Choose a {label.toLowerCase()}…
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

export function PairingList({ pairings, initialQuery }: { pairings: Pairing[]; initialQuery: string }) {
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
                <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
                    {normalized ? `${visible.length} of ${pairings.length} pairings` : `${pairings.length} ${pairings.length === 1 ? "pairing" : "pairings"}`}
                </p>
            </div>

            {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    {pairings.length === 0 ? "No pairings yet. Add one above." : "No pairings match your filter."}
                </p>
            ) : (
                <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {visible.map((p) => (
                        <PairingRow key={`${p.tutor.id}:${p.student.id}`} pairing={p} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function PairingRow({ pairing }: { pairing: Pairing }) {
    const { tutor, student } = pairing;
    const [state, formAction, pending] = useActionState<PairingState>(removePairing.bind(null, tutor.id, student.id), {});

    return (
        <li className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-3">
                <dl className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <PersonCell role="Tutor" person={tutor} />
                    <PersonCell role="Student" person={student} />
                </dl>
                <form
                    action={formAction}
                    onSubmit={(event) => {
                        if (!confirm(`Remove the pairing between ${tutor.name} and ${student.name}?`)) event.preventDefault();
                    }}
                >
                    <button
                        type="submit"
                        disabled={pending}
                        className="h-10 shrink-0 rounded-xl px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                        {pending ? "Removing…" : "Remove"}
                    </button>
                </form>
            </div>
            <FormError message={state.error} />
        </li>
    );
}

function PersonCell({ role, person }: { role: string; person: Person }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{role}</dt>
            <dd className="truncate">
                <Link href={`/volunteers/${person.id}`} className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50">
                    {person.name}
                </Link>
            </dd>
        </div>
    );
}
