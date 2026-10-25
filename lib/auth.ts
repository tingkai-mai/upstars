import { db } from "@/db";
import type { UserRole } from "@/lib/users";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    plugins: [
        admin({
            defaultRole: "student" satisfies UserRole,
            adminRoles: ["admin"],
            // Restricts roles to these values; anything else is rejected
            roles: { admin: adminAc, tutor: userAc, student: userAc } satisfies Record<UserRole, unknown>,
        }),
    ],
});
