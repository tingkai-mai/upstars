import { db } from "@/db";
import type { UserRole } from "@/lib/users";
import { isDemoEmail } from "@/lib/demo-accounts";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
        "http://localhost:3000",
        "https://upstars-one.vercel.app",
        "https://*.vercel.app",          // preview deploys (optional)
    ],
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    databaseHooks: {
        user: {
            create: {
                // Demo accounts are created directly in the database by the demo sign-in. Blocking their emails here
                // stops anyone signing up as one first, which would hand them a demo admin with their own password
                before: async (newUser) => (isDemoEmail(newUser.email) ? false : undefined),
            },
        },
    },
    plugins: [
        admin({
            defaultRole: "student" satisfies UserRole,
            adminRoles: ["admin"],
            // Restricts roles to these values; anything else is rejected
            roles: { admin: adminAc, tutor: userAc, student: userAc } satisfies Record<UserRole, unknown>,
        }),
        // Lets Server Actions (e.g. demo sign-in) set the session cookie. Must be the last plugin
        nextCookies(),
    ],
});
