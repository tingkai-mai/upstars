import type { ReactNode } from "react";

/** A two-column table: item details on the left, a Done tick-box on the right. */
export function CompletionTable({ itemLabel, children }: { itemLabel: string; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                        <th scope="col" className="px-3 py-2 font-medium">
                            {itemLabel}
                        </th>
                        <th scope="col" className="w-14 px-3 py-2 text-center font-medium">
                            Done
                        </th>
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

/** Dates are shown in Singapore time, where Upstars operates. */
export function formatCompletedOn(date: Date) {
    return date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
}
