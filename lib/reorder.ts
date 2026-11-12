import { InvalidInput } from "./form-data";

/**
 * Checks a new order from a drag-and-drop names exactly the items in the list now, each once.
 * If not, someone added or removed one meanwhile (or the input was tampered with), so nothing is saved.
 */
export function readOrder(orderedIds: unknown, currentIds: string[]): string[] {
    const ids = Array.isArray(orderedIds) ? orderedIds.map(String) : [];
    const current = new Set(currentIds);
    const same = ids.length === current.size && new Set(ids).size === ids.length && ids.every((id) => current.has(id));
    if (!same) throw new InvalidInput("This list changed while you were moving things. Refresh and try again.");
    return ids;
}
