// Helpers for Server Actions: reading form fields and turning failures into messages for the form
import { refresh } from "next/cache";

export type FormResult = { error?: string };

/** Thrown while reading a form or checking it; its message is shown to the user. */
export class InvalidInput extends Error {}

export function text(formData: FormData, key: string, label: string) {
    const value = String(formData.get(key) ?? "").trim();
    if (!value) throw new InvalidInput(`${label} is required.`);
    return value;
}

export function wholeNumber(formData: FormData, key: string, label: string, { min = 0, max = 10_000 } = {}) {
    const value = Number(formData.get(key));
    if (!Number.isInteger(value) || value < min || value > max) throw new InvalidInput(`${label} must be a whole number from ${min} to ${max}.`);
    return value;
}

/** Like wholeNumber, but a blank field means "not set" (null). */
export function optionalWholeNumber(formData: FormData, key: string, label: string, range: { min?: number; max?: number } = {}) {
    return String(formData.get(key) ?? "").trim() === "" ? null : wholeNumber(formData, key, label, range);
}

export function assertFound(rows: unknown[]) {
    if (rows.length === 0) throw new InvalidInput("This item no longer exists. Refresh and try again.");
}

function postgresCode(error: unknown) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    return typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : undefined;
}

/**
 * Runs a change (callers check permissions first), turning bad input and constraint violations
 * into form errors, then refreshes the page.
 */
export async function runMutation(work: () => Promise<unknown>, duplicateMessage?: string): Promise<FormResult> {
    try {
        await work();
    } catch (error) {
        if (error instanceof InvalidInput) return { error: error.message };
        const code = postgresCode(error);
        if (code === "23505" && duplicateMessage) return { error: duplicateMessage };
        if (code === "23503") return { error: "This item no longer exists. Refresh and try again." };
        throw error;
    }
    refresh();
    return {};
}
