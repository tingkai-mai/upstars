"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resource } from "@/db/schema";
import { getAdminSession } from "@/lib/session";
import { assertFound, InvalidInput, runMutation, text, type FormResult } from "@/lib/form-data";

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

function resourceValues(formData: FormData) {
    return { name: text(formData, "name", "Name"), url: webUrl(formData) };
}

export async function createResource(formData: FormData) {
    return mutate(() => db.insert(resource).values(resourceValues(formData)));
}

export async function updateResource(id: string, formData: FormData) {
    return mutate(async () => {
        assertFound(await db.update(resource).set(resourceValues(formData)).where(eq(resource.id, id)).returning({ id: resource.id }));
    });
}

export async function deleteResource(id: string) {
    return mutate(() => db.delete(resource).where(eq(resource.id, id)));
}
