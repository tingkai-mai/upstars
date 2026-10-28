"use client";
import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH } from "@/lib/users";
import { Field, FormError, inputClass, primaryButtonClass } from "@/components/form";

type Mode = "login" | "signup";

const COPY = {
    login: {
        title: "Welcome back",
        subtitle: "Sign in to continue",
        submit: "Sign in",
        pending: "Signing in…",
        switchPrompt: "Don't have an account?",
        switchLabel: "Sign up",
        switchHref: "/signup",
    },
    signup: {
        title: "Create an account",
        subtitle: "Get started in under a minute",
        submit: "Create account",
        pending: "Creating account…",
        switchPrompt: "Already have an account?",
        switchLabel: "Sign in",
        switchHref: "/login",
    },
} as const;

async function submitAuth(mode: Mode, form: FormData) {
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (mode === "login") return authClient.signIn.email({ email, password });
    const name = String(form.get("name")).trim();
    return authClient.signUp.email({ email, password, name });
}

export function AuthForm({ mode }: { mode: Mode }) {
    const copy = COPY[mode];
    const router = useRouter();
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setError("");
        setPending(true);
        try {
            const { error } = await submitAuth(mode, new FormData(form));
            if (error) {
                setError(error.message ?? "Something went wrong. Please try again.");
                return;
            }
            // Next keeps this page alive (hidden) after navigating, so clear the credentials.
            form.reset();
            setShowPassword(false);
            router.replace("/");
        } catch {
            setError("Couldn't reach the server. Check your connection and try again.");
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{copy.title}</h1>
                <p className="text-base text-zinc-600 dark:text-zinc-400">{copy.subtitle}</p>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {mode === "signup" && (
                    <Field label="Name" htmlFor="name">
                        <input id="name" name="name" type="text" autoComplete="name" required className={inputClass} />
                    </Field>
                )}

                <Field label="Email" htmlFor="email">
                    <input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        className={inputClass}
                    />
                </Field>

                <Field label="Password" htmlFor="password" hint={mode === "signup" ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
                            required
                            className={`${inputClass} pr-16`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((shown) => !shown)}
                            aria-pressed={showPassword}
                            className="absolute inset-y-0 right-0 px-4 text-base font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </Field>

                <FormError message={error} />

                <button
                    type="submit"
                    disabled={pending}
                    className={`mt-1 ${primaryButtonClass}`}
                >
                    {pending ? copy.pending : copy.submit}
                </button>
            </form>

            <p className="text-center text-base text-zinc-600 dark:text-zinc-400">
                {copy.switchPrompt}{" "}
                <Link href={copy.switchHref} replace className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50">
                    {copy.switchLabel}
                </Link>
            </p>
        </div>
    );
}
