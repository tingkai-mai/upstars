"use client";
import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError, primaryButtonClass, selectClass, selectStyle } from "@/components/form";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { isUserRole, ROLE_LABELS, type UserRole } from "@/lib/users";
import { signInAsDemo } from "./demo-actions";

type Tab = "demo" | "account";

const TABS: { key: Tab; label: string }[] = [
    { key: "demo", label: "Demo" },
    { key: "account", label: "Account" },
];

const DEMO_ROLES: UserRole[] = ["admin", "tutor", "student"];

/**
 * Demo sign-in, or the usual sign-in / sign-up form (children). Lives in the auth layout, so the chosen tab
 * survives moving between /login and /signup. Starts on Demo.
 */
export function AuthTabs({ children }: { children: ReactNode }) {
    const [tab, setTab] = useState<Tab>("demo");
    const id = useId();

    return (
        <div className="flex flex-col gap-8">
            <div role="tablist" aria-label="How to sign in" className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        id={`${id}-${t.key}-tab`}
                        aria-selected={tab === t.key}
                        aria-controls={`${id}-${t.key}`}
                        onClick={() => setTab(t.key)}
                        className={`flex h-10 items-center justify-center rounded-lg text-sm font-medium transition ${
                            tab === t.key ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {/* Hidden rather than unmounted, so switching tabs keeps what was typed */}
            <div role="tabpanel" id={`${id}-demo`} aria-labelledby={`${id}-demo-tab`} hidden={tab !== "demo"}>
                <DemoSignIn />
            </div>
            <div role="tabpanel" id={`${id}-account`} aria-labelledby={`${id}-account-tab`} hidden={tab !== "account"}>
                {children}
            </div>
        </div>
    );
}

function DemoSignIn() {
    const router = useRouter();
    const [role, setRole] = useState<UserRole>("admin");
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const account = DEMO_ACCOUNTS[role];

    function signIn() {
        setError(undefined);
        startTransition(async () => {
            const result = await signInAsDemo(role);
            if (result.error) setError(result.error);
            else router.replace("/");
        });
    }

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Try Upstars</h1>
                <p className="text-base text-zinc-500 dark:text-zinc-400">Explore with a demo account. No sign-up needed.</p>
            </header>

            <div className="flex flex-col gap-5">
                <Field label="Sign in as" htmlFor="demo-role" hint={account.description}>
                    <select id="demo-role" value={role} onChange={(event) => isUserRole(event.target.value) && setRole(event.target.value)} className={selectClass} style={selectStyle}>
                        {DEMO_ROLES.map((r) => (
                            <option key={r} value={r}>
                                Demo {ROLE_LABELS[r].toLowerCase()}
                            </option>
                        ))}
                    </select>
                </Field>

                <FormError message={error} />

                <button type="button" onClick={signIn} disabled={pending} className={`mt-1 ${primaryButtonClass}`}>
                    {pending ? "Signing in…" : `Sign in as ${account.name}`}
                </button>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">Demo accounts are shared, so other people may be using them at the same time and will see your changes.</p>
            </div>
        </div>
    );
}
