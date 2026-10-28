import { ROLE_LABELS, type UserRole } from "@/lib/users";

const ROLE_STYLES: Record<UserRole, string> = {
    admin: "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900",
    tutor: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    student: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export function RoleBadge({ role }: { role: UserRole }) {
    return <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${ROLE_STYLES[role]}`}>{ROLE_LABELS[role]}</span>;
}
