import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { ChevronRightIcon, StarIcon } from "@/components/icons";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { loadGuide } from "@/lib/guide";
import { isDemoEmail } from "@/lib/demo-accounts";
import { isUserRole } from "@/lib/users";
import { SECTIONS, SectionIcon, type SectionKey } from "@/lib/sections";
import { CheckInSection } from "@/app/check-in/check-in-section";
import { OnboardingGuide } from "./onboarding-guide";

type Tile = { section: SectionKey; title: string; description: string; href: string };

const STAFF_TILES: SectionKey[] = ["people", "syllabus", "goals", "resources"];

// Students see their own progress first, and plainer names written to them
const STUDENT_TILES: { section: SectionKey; title: string; description: string }[] = [
    { section: "goals", title: "My progress", description: "Your goals and what you've learnt" },
    { section: "syllabus", title: "Syllabus", description: "What you'll learn, week by week" },
    { section: "people", title: "My profile", description: "Your tutor and your past lessons" },
    { section: "resources", title: "Resources", description: "Guides and materials" },
];

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
    const tiles: Tile[] =
        user.role === "student"
            ? STUDENT_TILES.map((t) => ({ ...t, href: t.section === "people" ? `/volunteers/${user.id}` : SECTIONS[t.section].href }))
            : STAFF_TILES.map((section) => ({ section, ...SECTIONS[section] }));

    return (
        <>
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-base font-medium text-zinc-600 dark:text-zinc-400">
                        <span className="text-star">
                            <StarIcon className="size-5" />
                        </span>
                        Upstars Assistant
                    </p>
                    <h1 className="mt-1 text-4xl font-bold break-words text-zinc-900 dark:text-zinc-50">Hi, {user.name}</h1>
                </div>
                <OnboardingGuide pages={guidePages} seenIn={isDemoEmail(user.email) ? "browser" : "account"} seen={Boolean(account?.onboardedAt)} userId={user.id} />
            </header>

            {canCheckIn && <CheckInSection viewer={user} params={await searchParams} />}

            <nav aria-labelledby="sections-heading" className="flex flex-col gap-3">
                <h2 id="sections-heading" className="text-xl text-zinc-900 dark:text-zinc-50">
                    Where would you like to go?
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                    {tiles.map((tile) => (
                        <li key={tile.section}>
                            <SectionTile tile={tile} />
                        </li>
                    ))}
                </ul>
            </nav>

            {/* At the bottom, away from everyday buttons, so it isn't tapped by mistake */}
            <SignOutButton />
        </>
    );
}

/** A large, coloured link to one section. The colour and icon reappear in that section's header. */
function SectionTile({ tile }: { tile: Tile }) {
    return (
        <Link
            href={tile.href}
            className="flex h-full min-h-24 items-center gap-4 rounded-2xl border-2 border-zinc-200 bg-white p-4 text-left text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.99] sm:p-5 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
        >
            <SectionIcon section={tile.section} className="size-14 rounded-2xl [&>svg]:size-8" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xl font-bold">{tile.title}</span>
                <span className="text-base text-zinc-600 dark:text-zinc-400">{tile.description}</span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
                <ChevronRightIcon />
            </span>
        </Link>
    );
}
