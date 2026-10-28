"use client";
import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/components/form";
import { ChevronRightIcon } from "@/components/icons";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/users";
import { RoleBadge } from "./role-badge";

type Member = { id: string; name: string; email: string; role: UserRole; currentLevel: string | null };
type Props = { users: Member[]; viewerId: string; admin: boolean };

const chipClass = "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-base font-medium transition";

/** Everyone, filtered by name or email and by role. */
export function UserList({ users, viewerId, admin }: Props) {
    const [query, setQuery] = useState("");
    const [role, setRole] = useState<UserRole | "all">("all");
    const normalized = query.trim().toLowerCase();
    const visible = users.filter(
        (member) => (role === "all" || member.role === role) && (!normalized || member.name.toLowerCase().includes(normalized) || member.email.toLowerCase().includes(normalized)),
    );
    const filters: { value: UserRole | "all"; label: string }[] = [{ value: "all", label: "Everyone" }, ...USER_ROLES.map((r) => ({ value: r, label: `${ROLE_LABELS[r]}s` }))];

    return (
        <section className="flex flex-col gap-4">
            <Field label="Find a person" htmlFor="user-filter">
                <input id="user-filter" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a name or email" autoComplete="off" className={inputClass} />
            </Field>
            <div role="group" aria-label="Show" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        aria-pressed={role === filter.value}
                        onClick={() => setRole(filter.value)}
                        className={`${chipClass} ${
                            role === filter.value
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                                : "border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
            <p className="text-base text-zinc-600 dark:text-zinc-400" aria-live="polite">
                {visible.length === users.length ? `${users.length} ${users.length === 1 ? "person" : "people"}` : `Showing ${visible.length} of ${users.length}`}
            </p>

            {visible.length === 0 ? (
                <p className="rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-base text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">No one matches. Try another name or Everyone.</p>
            ) : (
                <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {visible.map((member) => (
                        <li key={member.id}>
                            <Link
                                // Admins have no profile, so admins go straight to editing them
                                href={admin && member.role === "admin" ? `/volunteers/${member.id}/edit` : `/volunteers/${member.id}`}
                                className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                                        {member.name}
                                        {member.id === viewerId && <span className="font-normal text-zinc-600 dark:text-zinc-400"> (you)</span>}
                                    </p>
                                    <p className="mt-1 flex flex-wrap items-center gap-2 text-base text-zinc-600 dark:text-zinc-400">
                                        <RoleBadge role={member.role} />
                                        {member.currentLevel}
                                    </p>
                                </div>
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    <ChevronRightIcon />
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
