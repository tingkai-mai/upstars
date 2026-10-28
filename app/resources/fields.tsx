import { Field, inputClass, textareaClass } from "@/components/form";

export const MAX_DESCRIPTION_LENGTH = 200;

export function ResourceFields({ defaults }: { defaults?: { name: string; url: string; description: string | null } }) {
    return (
        <>
            <Field label="Name" htmlFor="name">
                <input id="name" name="name" type="text" required autoComplete="off" defaultValue={defaults?.name} placeholder="e.g. Tutor handbook" className={inputClass} />
            </Field>
            <Field label="Link" htmlFor="url" hint="Paste the web address, e.g. docs.google.com/…">
                {/* type="text" rather than "url" so "example.com" is accepted; the server adds https:// */}
                <input id="url" name="url" type="text" inputMode="url" required autoComplete="off" autoCapitalize="none" spellCheck={false} defaultValue={defaults?.url} placeholder="Paste a web address" className={inputClass} />
            </Field>
            <Field label="Description (optional)" htmlFor="description" hint={`A short line on what it's for. Up to ${MAX_DESCRIPTION_LENGTH} characters.`}>
                <textarea id="description" name="description" maxLength={MAX_DESCRIPTION_LENGTH} defaultValue={defaults?.description ?? undefined} className={textareaClass} />
            </Field>
        </>
    );
}
