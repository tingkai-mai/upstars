import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

async function RedirectIfSignedIn() {
    if (await getSession()) redirect("/");
    return null;
}

export default function AuthLayout({ children }: LayoutProps<"/">) {
    return (
        <main className="flex flex-1 flex-col bg-white px-6 pt-16 pb-8 sm:items-center sm:justify-center sm:bg-zinc-50 sm:py-12 dark:bg-zinc-950 sm:dark:bg-black">
            <Suspense fallback={null}>
                <RedirectIfSignedIn />
            </Suspense>
            <div className="w-full sm:max-w-sm sm:rounded-2xl sm:border sm:border-zinc-200 sm:bg-white sm:p-8 sm:shadow-sm dark:sm:border-zinc-800 dark:sm:bg-zinc-950">
                {children}
            </div>
        </main>
    );
}
