// Used only inside client components, so it needs no "use client" entry of its own
import { Fragment, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { selectClass, selectStyle } from "@/components/form";

/** Updates search params on the current page, keeping the others (except ?level=, which ?subject= replaces). */
export function useUrlFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pending, startTransition] = useTransition();

    function update(changes: Record<string, string>) {
        const params = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(changes)) params.set(key, value);
        params.delete("level");
        startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
    }

    return { pending, update };
}

type Option = { value: string; label: string; group?: string };

type FilterSelectProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    /** Options with a group are shown under that heading, in the order the groups first appear */
    options: Option[];
    className?: string;
};

export function FilterSelect({ id, label, value, onChange, options, className = "" }: FilterSelectProps) {
    const groups = [...new Set(options.map((o) => o.group))];
    const renderOptions = (items: Option[]) =>
        items.map((option) => (
            <option key={option.value} value={option.value}>
                {option.label}
            </option>
        ));

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label htmlFor={id} className="text-base font-medium text-zinc-800 dark:text-zinc-300">
                {label}
            </label>
            <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass} style={selectStyle}>
                {groups.map((group) =>
                    group === undefined ? (
                        <Fragment key="">{renderOptions(options.filter((o) => o.group === undefined))}</Fragment>
                    ) : (
                        <optgroup key={group} label={group}>
                            {renderOptions(options.filter((o) => o.group === group))}
                        </optgroup>
                    ),
                )}
            </select>
        </div>
    );
}
