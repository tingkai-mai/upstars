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

export type UserFormValues = { name: string; email: string; role: UserRole };
export type ActionState = { error?: string };

const NOT_ALLOWED = { error: "Only admins can manage volunteers." };

function parseUserForm(formData: FormData): UserFormValues | null {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = formData.get("role");
    if (!name || !email || !isUserRole(role)) return null;
    return { name, email, role };
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

    try {
        await auth.api.createUser({ body: { ...values, password }, headers: await headers() });
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

    const [existing] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
    if (!existing) return { error: "This user no longer exists." };

    try {
        await auth.api.adminUpdateUser({ body: { userId, data: values }, headers: await headers() });
    } catch (error) {
        return { error: errorMessage(error) };
    }

    // A user's pairings depend on their role, so a role change invalidates all of them
    if (existing.role !== values.role) {
        await db.delete(pairing).where(or(eq(pairing.tutorId, userId), eq(pairing.studentId, userId)));
    }
    redirect(`/volunteers/${userId}`);
}

export async function deleteUser(userId: string): Promise<ActionState> {
    const session = await getAdminSession();
    if (!session) return NOT_ALLOWED;
    if (userId === session.user.id) return { error: "You can't delete your own account." };

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

    const inserted = await db.insert(pairing).values({ tutorId, studentId }).onConflictDoNothing().returning({ tutorId: pairing.tutorId });
    if (inserted.length === 0) return { error: `${tutor.name} is already paired with ${student.name}.` };

    refresh();
    return { success: `Paired ${tutor.name} with ${student.name}.` };
}

export async function removePairing(tutorId: string, studentId: string): Promise<PairingState> {
    if (!(await getAdminSession())) return NOT_ALLOWED;
    await db.delete(pairing).where(and(eq(pairing.tutorId, tutorId), eq(pairing.studentId, studentId)));
    refresh();
    return {};
}
