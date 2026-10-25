import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { loadGuide } from "@/lib/guide";
import { isDemoEmail } from "@/lib/demo-accounts";
import { isUserRole } from "@/lib/users";
import { CheckInSection } from "@/app/check-in/check-in-section";
import { OnboardingGuide } from "./onboarding-guide";

type Module = { title: string; description: string; href?: string };

const MODULES: Module[] = [
    { title: "Volunteer management", description: "Manage tutors, students and admins", href: "/volunteers" },
    { title: "Syllabus management", description: "Plan chapters, concepts and worksheets", href: "/syllabus" },
    { title: "Goal tracking", description: "Student goals and syllabus progress", href: "/goals" },
    { title: "Upstars resources", description: "Guides and materials", href: "/resources" },
];

const tileClass = "flex min-h-24 flex-col justify-center gap-1 rounded-2xl border p-5 text-left";

type Props = PageProps<"/">;

export default function Home({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
                <Dashboard searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function Dashboard({ searchParams }: Pick<Props, "searchParams">) {
    const user = await requireUser();
    const canCheckIn = user.role === "tutor" || user.role === "admin";
    const [[account], guidePages] = await Promise.all([db.select({ onboardedAt: userTable.onboardedAt }).from(userTable).where(eq(userTable.id, user.id)), loadGuide(isUserRole(user.role) ? user.role : "student")]);
    // Students only see their own profile in volunteer management
    const modules = user.role === "student" ? MODULES.map((m) => (m.href === "/volunteers" ? { title: "My profile", description: "Your tutor, goals and past lessons", href: `/volunteers/${user.id}` } : m)) : MODULES;

    return (
        <>
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Upstars Assistant</p>
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">Hi, {user.name}</h1>
                </div>
                <div className="flex shrink-0 gap-2">
                    <OnboardingGuide pages={guidePages} seenIn={isDemoEmail(user.email) ? "browser" : "account"} seen={Boolean(account?.onboardedAt)} userId={user.id} />
                    <SignOutButton />
                </div>
            </header>

            {canCheckIn && <CheckInSection viewer={user} params={await searchParams} />}

            <nav aria-label="Modules" className="grid gap-3 sm:grid-cols-2">
                {modules.map((module) => (module.href ? <ModuleLink key={module.title} module={module} href={module.href} /> : <DisabledModule key={module.title} module={module} />))}
            </nav>
        </>
    );
}

function ModuleLink({ module, href }: { module: Module; href: string }) {
    return (
        <Link
            href={href}
            className={`${tileClass} border-zinc-900 bg-zinc-900 text-white transition hover:bg-zinc-700 active:scale-[0.99] dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200`}
        >
            <span className="text-lg font-semibold">{module.title}</span>
            <span className="text-sm opacity-75">{module.description}</span>
        </Link>
    );
}

function DisabledModule({ module }: { module: Module }) {
    return (
        <button
            type="button"
            disabled
            className={`${tileClass} cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600`}
        >
            <span className="flex items-center justify-between gap-2 text-lg font-semibold">
                {module.title}
                <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">Coming soon</span>
            </span>
            <span className="text-sm">{module.description}</span>
        </button>
    );
}
