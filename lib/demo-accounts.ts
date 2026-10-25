import type { UserRole } from "@/lib/users";

/** Shared demo accounts, one per role. Safe to import on the client: no secrets here. */
export const DEMO_ACCOUNTS: Record<UserRole, { name: string; email: string; description: string }> = {
    admin: { name: "Demo Admin", email: "demo-admin@upstars.demo", description: "Manage volunteers, pairings, the syllabus and resources." },
    tutor: { name: "Demo Tutor", email: "demo-tutor@upstars.demo", description: "Check in lessons, track goals and browse profiles." },
    student: { name: "Demo Student", email: "demo-student@upstars.demo", description: "See your own profile, goals and past lessons." },
};

export function isDemoEmail(email: string) {
    return Object.values(DEMO_ACCOUNTS).some((account) => account.email === email.toLowerCase());
}
