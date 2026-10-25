import Link from "next/link";
import { primaryButtonClass } from "@/components/form";

type NoAccessProps = { title: string; message: string; href?: string; linkLabel?: string };

export function NoAccess({ title, message, href = "/", linkLabel = "Back to home" }: NoAccessProps) {
    return (
        <div className="flex flex-col items-start gap-4 pt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
            <p className="text-base text-zinc-500 dark:text-zinc-400">{message}</p>
            <Link href={href} className={`${primaryButtonClass} sm:w-auto`}>
                {linkLabel}
            </Link>
        </div>
    );
}

export function AdminOnly() {
    return <NoAccess title="Admins only" message="You need an admin account to manage volunteers. Ask an admin to update your role." />;
}
