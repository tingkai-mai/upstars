"use server";
import { createHmac, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account, pairing, user } from "@/db/schema";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { isUserRole, type UserRole } from "@/lib/users";

/** Derived from the auth secret: stable, never stored in plain text, and never sent to the browser. */
function demoPassword(role: UserRole) {
    return createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "").update(`demo-account:${role}`).digest("base64url");
}

async function findUserId(email: string) {
    const [found] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    return found?.id;
}

/**
 * Creates the demo account if it's missing, and restores its name and role in case they were changed. Returns its id.
 * Inserted directly rather than through better-auth, which refuses demo emails (see lib/auth.ts).
 */
async function ensureDemoAccount(role: UserRole) {
    const { name, email } = DEMO_ACCOUNTS[role];
    if (!(await findUserId(email))) {
        const password = await hashPassword(demoPassword(role));
        try {
            await db.transaction(async (tx) => {
                const id = randomUUID();
                await tx.insert(user).values({ id, name, email, role });
                await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password });
            });
        } catch (error) {
            // Fine if someone else signing in to this demo account at the same moment created it first
            if (!(await findUserId(email))) throw error;
        }
    }
    const [updated] = await db
        .update(user)
        .set({ name, role, ...(role === "student" && { currentLevel: "Primary 6" }) })
        .where(eq(user.email, email))
        .returning({ id: user.id });
    return updated.id;
}

async function signIn(role: UserRole, userId: string) {
    const body = { email: DEMO_ACCOUNTS[role].email, password: demoPassword(role) };
    try {
        await auth.api.signInEmail({ body, headers: await headers() });
    } catch (error) {
        if (!(error instanceof APIError)) throw error;
        // The stored password no longer matches (e.g. BETTER_AUTH_SECRET changed): reset it and try once more
        await db
            .update(account)
            .set({ password: await hashPassword(body.password) })
            .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
        await auth.api.signInEmail({ body, headers: await headers() });
    }
}

/**
 * Signs in to a shared demo account, creating all three if needed and pairing the demo tutor with the demo student.
 * Many people can use one demo account at once: each sign-in gets its own session.
 */
export async function signInAsDemo(role: string): Promise<{ error?: string }> {
    if (!isUserRole(role)) return { error: "Choose a demo account." };
    try {
        const [admin, tutor, student] = await Promise.all([ensureDemoAccount("admin"), ensureDemoAccount("tutor"), ensureDemoAccount("student")]);
        // Does nothing if the demo student already has a tutor
        await db.insert(pairing).values({ tutorId: tutor, studentId: student }).onConflictDoNothing();
        await signIn(role, { admin, tutor, student }[role]);
    } catch (error) {
        console.error("Demo sign-in failed", error);
        return { error: "Couldn't sign in to the demo account. Please try again." };
    }
    return {};
}
