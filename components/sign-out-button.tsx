"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { secondaryButtonClass } from "@/components/form";

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
            className={`${secondaryButtonClass} disabled:opacity-60`}
        >
            {pending ? "Signing out…" : "Sign out"}
        </button>
    );
}
