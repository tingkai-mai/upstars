"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pairing, user } from "@/db/schema";
import { getAdminSession } from "@/lib/session";
import { isUserRole, MIN_PASSWORD_LENGTH, type UserRole } from "@/lib/users";
import { isDemoEmail } from "@/lib/demo-accounts";

export type UserFormValues = { name: string; email: string; role: UserRole; currentLevel: string };
export type ActionState = { error?: string };

const NOT_ALLOWED = { error: "Only admins can manage volunteers." };
// Shared by everyone trying the app, so they must keep working
const DEMO_LOCKED = { error: "Demo accounts can't be edited or deleted." };

function parseUserForm(formData: FormData): UserFormValues | null {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = formData.get("role");
    const currentLevel = String(formData.get("currentLevel") ?? "").trim();
    if (!name || !email || !isUserRole(role)) return null;
    return { name, email, role, currentLevel };
}

/** better-auth doesn't know about currentLevel, so it's saved separately; blank means not set. */
async function saveCurrentLevel(userId: string, currentLevel: string) {
    await db.update(user).set({ currentLevel: currentLevel || null }).where(eq(user.id, userId));
}

function errorMessage(error: unknown) {
    return error instanceof APIError ? error.message : "Something went wrong. Please try again.";
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
    if (!(await getAdminSession())) return NOT_ALLOWED;
    const values = parseUserForm(formData);
    if (!values) return { error: "Name, email and role are required." };
    const password = String(formData.get("password") ?? "");
    if (password.length < MIN_PASSWORD_LENGTH) {
        return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }

    const { currentLevel, ...authValues } = values;
    try {
        const created = await auth.api.createUser({ body: { ...authValues, password }, headers: await headers() });
        await saveCurrentLevel(created.user.id, currentLevel);
    } catch (error) {
        return { error: errorMessage(error) };
    }
    redirect("/volunteers");
}

export async function updateUser(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
    const session = await getAdminSession();
    if (!session) return NOT_ALLOWED;
    const values = parseUserForm(formData);
    if (!values) return { error: "Name, email and role are required." };
    if (userId === session.user.id && values.role !== "admin") {
        return { error: "You can't remove your own admin role." };
    }

    const [existing] = await db.select({ role: user.role, email: user.email }).from(user).where(eq(user.id, userId));
    if (!existing) return { error: "This user no longer exists." };
    if (isDemoEmail(existing.email) || isDemoEmail(values.email)) return DEMO_LOCKED;

    const { currentLevel, ...authValues } = values;
    try {
        await auth.api.adminUpdateUser({ body: { userId, data: authValues }, headers: await headers() });
        await saveCurrentLevel(userId, currentLevel);
    } catch (error) {
        return { error: errorMessage(error) };
    }

    // A user's pairings depend on their role, so a role change invalidates all of them
    if (existing.role !== values.role) {
        await db.delete(pairing).where(or(eq(pairing.tutorId, userId), eq(pairing.studentId, userId)));
    }
    // Admins have no profile page to return to
    redirect(values.role === "admin" ? "/volunteers" : `/volunteers/${userId}`);
}

export async function deleteUser(userId: string): Promise<ActionState> {
    const session = await getAdminSession();
    if (!session) return NOT_ALLOWED;
    if (userId === session.user.id) return { error: "You can't delete your own account." };
    const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
    if (target && isDemoEmail(target.email)) return DEMO_LOCKED;

    try {
        // Sessions, accounts and pairings are removed by ON DELETE CASCADE
        await auth.api.removeUser({ body: { userId }, headers: await headers() });
    } catch (error) {
        return { error: errorMessage(error) };
    }
    redirect("/volunteers");
}

export type PairingState = { error?: string; success?: string };

export async function createPairing(_prev: PairingState, formData: FormData): Promise<PairingState> {
    if (!(await getAdminSession())) return NOT_ALLOWED;
    const tutorId = String(formData.get("tutorId") ?? "");
    const studentId = String(formData.get("studentId") ?? "");
    if (!tutorId || !studentId) return { error: "Choose a tutor and a student." };

    // The database can't check roles, so make sure each person still has the right one
    const people = await db.select({ id: user.id, name: user.name, role: user.role }).from(user).where(inArray(user.id, [tutorId, studentId]));
    const tutor = people.find((person) => person.id === tutorId && person.role === "tutor");
    const student = people.find((person) => person.id === studentId && person.role === "student");
    if (!tutor || !student) return { error: "That tutor or student no longer exists, or their role has changed. Refresh and try again." };

    // A student has at most one tutor; the unique constraint backs this up against races
    const [existing] = await db.select({ name: user.name }).from(pairing).innerJoin(user, eq(pairing.tutorId, user.id)).where(eq(pairing.studentId, studentId));
    if (existing) return { error: `${student.name} is already paired with ${existing.name}. Remove that pairing first.` };

    const inserted = await db.insert(pairing).values({ tutorId, studentId }).onConflictDoNothing().returning({ tutorId: pairing.tutorId });
    if (inserted.length === 0) return { error: `${student.name} was just paired with another tutor. Refresh and try again.` };

    refresh();
    return { success: `Paired ${tutor.name} with ${student.name}.` };
}

export async function removePairing(tutorId: string, studentId: string): Promise<PairingState> {
    if (!(await getAdminSession())) return NOT_ALLOWED;
    await db.delete(pairing).where(and(eq(pairing.tutorId, tutorId), eq(pairing.studentId, studentId)));
    refresh();
    return {};
}
