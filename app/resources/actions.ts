"use server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resource } from "@/db/schema";
import { getAdminSession } from "@/lib/session";
import { assertFound, InvalidInput, runMutation, text, type FormResult } from "@/lib/form-data";
import { MAX_DESCRIPTION_LENGTH } from "./fields";

/** Runs an admin-only change, turning bad input into form errors. */
async function mutate(work: () => Promise<unknown>): Promise<FormResult> {
    if (!(await getAdminSession())) return { error: "Only admins can edit resources." };
    return runMutation(work);
}

/** Accepts "example.com/page" as https, and rejects anything that isn't an http(s) link (e.g. javascript:). */
function webUrl(formData: FormData) {
    const raw = text(formData, "url", "Link");
    const withScheme = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(withScheme);
        if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".")) return url.href;
    } catch {}
    throw new InvalidInput("Enter a valid web link, e.g. https://example.com.");
}

/** Optional; blank means none. */
function description(formData: FormData) {
    const value = String(formData.get("description") ?? "").trim();
    if (value.length > MAX_DESCRIPTION_LENGTH) throw new InvalidInput(`Description can be at most ${MAX_DESCRIPTION_LENGTH} characters.`);
    return value || null;
}

function resourceValues(formData: FormData) {
    return { name: text(formData, "name", "Name"), url: webUrl(formData), description: description(formData) };
}

/** New resources go to the end of the list. */
export async function createResource(formData: FormData) {
    return mutate(() => db.insert(resource).values({ ...resourceValues(formData), position: sql`(SELECT coalesce(max(${resource.position}), 0) + 1 FROM ${resource})` }));
}

export async function updateResource(id: string, formData: FormData) {
    return mutate(async () => {
        assertFound(await db.update(resource).set(resourceValues(formData)).where(eq(resource.id, id)).returning({ id: resource.id }));
    });
}

export async function deleteResource(id: string) {
    return mutate(() => db.delete(resource).where(eq(resource.id, id)));
}

/** Swaps a resource with its neighbour, then renumbers the list 1..n so gaps and ties can't build up. */
export async function moveResource(id: string, direction: "up" | "down") {
    return mutate(() =>
        db.transaction(async (tx) => {
            if (direction !== "up" && direction !== "down") throw new InvalidInput("Invalid direction.");
            // Lock the list so concurrent moves can't interleave
            const ordered = await tx.select({ id: resource.id, position: resource.position }).from(resource).orderBy(asc(resource.position), asc(resource.createdAt)).for("update");
            const from = ordered.findIndex((r) => r.id === id);
            if (from === -1) assertFound([]); // deleted meanwhile
            const to = direction === "up" ? from - 1 : from + 1;
            if (to < 0 || to >= ordered.length) return; // already at the edge
            [ordered[from], ordered[to]] = [ordered[to], ordered[from]];

            for (const [index, item] of ordered.entries()) {
                if (item.position !== index + 1) await tx.update(resource).set({ position: index + 1 }).where(eq(resource.id, item.id));
            }
        }),
    );
}
