import { Field, inputClass } from "@/components/form";

export function ResourceFields({ defaults }: { defaults?: { name: string; url: string } }) {
    return (
        <>
            <Field label="Name" htmlFor="name">
                <input id="name" name="name" type="text" required autoComplete="off" defaultValue={defaults?.name} placeholder="e.g. Tutor handbook" className={inputClass} />
            </Field>
            <Field label="Link" htmlFor="url">
                {/* type="text" rather than "url" so "example.com" is accepted; the server adds https:// */}
                <input id="url" name="url" type="text" inputMode="url" required autoComplete="off" autoCapitalize="none" spellCheck={false} defaultValue={defaults?.url} placeholder="https://…" className={inputClass} />
            </Field>
        </>
    );
}
