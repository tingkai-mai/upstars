import { Suspense, type ComponentType } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { BookIcon, ChevronRightIcon, LinkIcon, PeopleIcon, TargetIcon } from "@/components/icons";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { loadGuide } from "@/lib/guide";
import { isDemoEmail } from "@/lib/demo-accounts";
import { isUserRole } from "@/lib/users";
import { CheckInSection } from "@/app/check-in/check-in-section";
import { OnboardingGuide } from "./onboarding-guide";

type Module = { title: string; description: string; href?: string; Icon: ComponentType };

const MODULES: Module[] = [
    { title: "Volunteer management", description: "Manage tutors, students and admins", href: "/volunteers", Icon: PeopleIcon },
    { title: "Syllabus management", description: "Plan chapters, concepts and worksheets", href: "/syllabus", Icon: BookIcon },
    { title: "Goal tracking", description: "Student goals and syllabus progress", href: "/goals", Icon: TargetIcon },
    { title: "Upstars resources", description: "Guides and materials", href: "/resources", Icon: LinkIcon },
];

// Students only see their own profile in volunteer management, and get plainer names
const STUDENT_MODULES: Record<string, Partial<Module>> = {
    "Volunteer management": { title: "My profile", description: "Your tutor, goals and past lessons" },
    "Syllabus management": { title: "Syllabus", description: "What you'll learn, week by week" },
    "Goal tracking": { title: "My progress", description: "Your goals and what you've covered" },
};

const tileClass = "flex min-h-20 items-center gap-4 rounded-2xl border p-4 text-left sm:p-5";
const tileIconClass = "flex size-12 shrink-0 items-center justify-center rounded-xl";

type Props = PageProps<"/">;

export default function Home({ searchParams }: Props) {
    return (
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
            <Suspense fallback={<p className="text-zinc-600">Loading…</p>}>
                <Dashboard searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function Dashboard({ searchParams }: Pick<Props, "searchParams">) {
    const user = await requireUser();
    const canCheckIn = user.role === "tutor" || user.role === "admin";
    const [[account], guidePages] = await Promise.all([db.select({ onboardedAt: userTable.onboardedAt }).from(userTable).where(eq(userTable.id, user.id)), loadGuide(isUserRole(user.role) ? user.role : "student")]);
    const modules = user.role === "student" ? MODULES.map((m) => ({ ...m, ...STUDENT_MODULES[m.title], ...(m.href === "/volunteers" && { href: `/volunteers/${user.id}` }) })) : MODULES;

    return (
        <>
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-base text-zinc-600 dark:text-zinc-400">Upstars Assistant</p>
                    <h1 className="text-3xl font-semibold tracking-tight break-words text-zinc-900 dark:text-zinc-50">Hi, {user.name}</h1>
                </div>
                <OnboardingGuide pages={guidePages} seenIn={isDemoEmail(user.email) ? "browser" : "account"} seen={Boolean(account?.onboardedAt)} userId={user.id} />
            </header>

            {canCheckIn && <CheckInSection viewer={user} params={await searchParams} />}

            <nav aria-labelledby="modules-heading" className="flex flex-col gap-3">
                <h2 id="modules-heading" className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Go to
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {modules.map((module) => (module.href ? <ModuleLink key={module.title} module={module} href={module.href} /> : <DisabledModule key={module.title} module={module} />))}
                </div>
            </nav>

            {/* At the bottom, away from everyday buttons, so it isn't tapped by mistake */}
            <SignOutButton />
        </>
    );
}

function ModuleLink({ module, href }: { module: Module; href: string }) {
    return (
        <Link
            href={href}
            className={`${tileClass} border-zinc-200 bg-white text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900`}
        >
            <span className={`${tileIconClass} bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50`}>
                <module.Icon />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-lg font-semibold">{module.title}</span>
                <span className="text-base text-zinc-600 dark:text-zinc-400">{module.description}</span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
                <ChevronRightIcon />
            </span>
        </Link>
    );
}

function DisabledModule({ module }: { module: Module }) {
    return (
        <button
            type="button"
            disabled
            className={`${tileClass} cursor-not-allowed border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500`}
        >
            <span className={`${tileIconClass} bg-zinc-100 dark:bg-zinc-800`}>
                <module.Icon />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-lg font-semibold">{module.title}</span>
                <span className="text-base">{module.description}</span>
            </span>
            <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">Coming soon</span>
        </button>
    );
}
