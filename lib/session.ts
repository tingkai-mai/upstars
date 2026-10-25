import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
    return auth.api.getSession({ headers: await headers() });
}

/** Returns the signed-in user, or redirects to /login. */
export async function requireUser() {
    const session = await getSession();
    if (!session) redirect("/login");
    return session.user;
}

export function isAdmin(user: { role?: string | null }) {
    return user.role === "admin";
}

/** Returns the signed-in user if they're an admin, or null. Redirects to /login if signed out. */
export async function getAdminUser() {
    const user = await requireUser();
    return isAdmin(user) ? user : null;
}
