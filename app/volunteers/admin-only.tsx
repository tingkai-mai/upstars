import Link from "next/link";
import { primaryButtonClass } from "@/components/form";

export function AdminOnly() {
    return (
        <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Admins only</h1>
            <p className="text-base text-zinc-500 dark:text-zinc-400">You need an admin account to manage volunteers. Ask an admin to update your role.</p>
            <Link href="/" className={`${primaryButtonClass} sm:w-auto`}>
                Back to home
            </Link>
        </div>
    );
}
