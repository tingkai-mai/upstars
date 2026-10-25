import { Field, inputClass, selectClass, selectStyle } from "@/components/form";

function TextField({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
    return (
        <Field label={label} htmlFor={name}>
            <input id={name} name={name} type="text" required autoComplete="off" defaultValue={defaultValue} placeholder={placeholder} className={inputClass} />
        </Field>
    );
}

function NumberField({ name, label, defaultValue, min, hint }: { name: string; label: string; defaultValue?: number; min: number; hint?: string }) {
    return (
        <Field label={label} htmlFor={name} hint={hint}>
            <input id={name} name={name} type="number" inputMode="numeric" required min={min} step={1} defaultValue={defaultValue} className={inputClass} />
        </Field>
    );
}

export function ChapterFields({ defaultName }: { defaultName?: string }) {
    return <TextField name="name" label="Chapter name" defaultValue={defaultName} placeholder="e.g. Fractions" />;
}

type WeekFieldsProps = {
    defaults: { number: number; durationMin?: number; chapterId?: string };
    /** When given, the week can be moved to another chapter */
    chapters?: { id: string; name: string }[];
};

export function WeekFields({ defaults, chapters }: WeekFieldsProps) {
    return (
        <>
            <NumberField name="number" label="Week number" defaultValue={defaults.number} min={1} />
            <NumberField name="durationMin" label="Teaching time (minutes)" defaultValue={defaults.durationMin} min={0} hint="Split evenly across the week's concepts." />
            {chapters && (
                <Field label="Chapter" htmlFor="chapterId">
                    <select id="chapterId" name="chapterId" defaultValue={defaults.chapterId} className={selectClass} style={selectStyle}>
                        {chapters.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
        </>
    );
}

export function ConceptFields({ defaultName }: { defaultName?: string }) {
    return <TextField name="name" label="Concept" defaultValue={defaultName} placeholder="e.g. Write in numerals" />;
}
