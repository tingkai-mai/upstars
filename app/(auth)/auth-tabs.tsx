"use client";
import { useId, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FormError, primaryButtonClass } from "@/components/form";
import { activeTabClass, inactiveTabClass, tabClass } from "@/components/tabs";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { ROLE_LABELS, type UserRole } from "@/lib/users";
import { signInAsDemo } from "./demo-actions";

type Tab = "demo" | "account";

const TABS: { key: Tab; label: string }[] = [
    { key: "demo", label: "Try a demo" },
    { key: "account", label: "My account" },
];

const DEMO_ROLES: UserRole[] = ["admin", "tutor", "student"];

/**
 * Demo sign-in, or the usual sign-in / sign-up form (children). Lives in the auth layout, so the chosen tab
 * survives moving between /login and /signup. Starts on Demo, except at /signup, where people come to make an account.
 */
export function AuthTabs({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [tab, setTab] = useState<Tab>(pathname === "/signup" ? "account" : "demo");
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
                        className={`${tabClass} ${tab === t.key ? activeTabClass : inactiveTabClass}`}
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
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Try Upstars Assistant</h1>
                <p className="text-base text-zinc-600 dark:text-zinc-400">Explore with a demo account. No sign-up needed.</p>
            </header>

            <div className="flex flex-col gap-5">
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-base font-medium text-zinc-800 dark:text-zinc-200">Sign in as</legend>
                    {DEMO_ROLES.map((r) => (
                        <label
                            key={r}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-zinc-200 p-4 transition has-checked:border-zinc-900 has-checked:bg-zinc-50 has-focus-visible:ring-2 has-focus-visible:ring-sky-600 dark:border-zinc-800 dark:has-checked:border-zinc-50 dark:has-checked:bg-zinc-900"
                        >
                            <input type="radio" name="demo-role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-1 size-5 shrink-0 accent-zinc-900 dark:accent-zinc-100" />
                            <span>
                                <span className="block text-lg font-semibold text-zinc-900 dark:text-zinc-50">{ROLE_LABELS[r]}</span>
                                <span className="block text-base text-zinc-600 dark:text-zinc-400">{DEMO_ACCOUNTS[r].description}</span>
                            </span>
                        </label>
                    ))}
                </fieldset>

                <FormError message={error} />

                <button type="button" onClick={signIn} disabled={pending} className={`mt-1 ${primaryButtonClass}`}>
                    {pending ? "Signing in…" : `Sign in as ${account.name}`}
                </button>

                <p className="text-base text-zinc-600 dark:text-zinc-400">Demo accounts are shared, so other people may be using them at the same time and will see your changes.</p>
            </div>
        </div>
    );
}
