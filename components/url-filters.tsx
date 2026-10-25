// Used only inside client components, so it needs no "use client" entry of its own
import { useTransition } from "react";
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

type FilterSelectProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
};

export function FilterSelect({ id, label, value, onChange, options, className = "" }: FilterSelectProps) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {label}
            </label>
            <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass} style={selectStyle}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
