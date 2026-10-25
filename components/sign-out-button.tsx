"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
    const [pending, setPending] = useState(false);

    async function signOut() {
        setPending(true);
        await authClient.signOut();
        // Full reload, not router.replace: Next keeps visited pages alive in hidden
        // <Activity> boundaries, so a client navigation would leave this user's state behind.
        window.location.replace("/login");
    }

    return (
        <button
            onClick={signOut}
            disabled={pending}
            className="h-10 rounded-xl border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
            {pending ? "Signing out…" : "Sign out"}
        </button>
    );
}
