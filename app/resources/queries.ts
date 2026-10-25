import { asc } from "drizzle-orm";
import { db } from "@/db";
import { resource } from "@/db/schema";

export type Resource = { id: string; name: string; url: string; description: string | null };

/** In the order admins arranged them. */
export async function listResources(): Promise<Resource[]> {
    return db.select({ id: resource.id, name: resource.name, url: resource.url, description: resource.description }).from(resource).orderBy(asc(resource.position), asc(resource.createdAt));
}
