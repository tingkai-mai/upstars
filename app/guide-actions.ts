"use server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getSession } from "@/lib/session";

/** Records that the signed-in user has seen the first-login guide, so it isn't shown again on any device. */
export async function markGuideSeen() {
    const session = await getSession();
    if (!session) return;
    await db
        .update(user)
        .set({ onboardedAt: new Date() })
        .where(and(eq(user.id, session.user.id), isNull(user.onboardedAt)));
}
