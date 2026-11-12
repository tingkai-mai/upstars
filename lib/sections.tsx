import type { ComponentType } from "react";
import { BookIcon, LinkIcon, PeopleIcon, TargetIcon } from "@/components/icons";

export type SectionKey = "people" | "syllabus" | "goals" | "resources";

type Section = { title: string; description: string; href: string; Icon: ComponentType; tone: string };

/**
 * The app's main areas. Each has its own colour and icon, shown on its home-page tile and again in its page
 * header, so people who don't read easily (young students, older tutors) can tell where they are at a glance.
 */
export const SECTIONS: Record<SectionKey, Section> = {
    people: {
        title: "People",
        description: "Tutors, students and who's paired with whom",
        href: "/volunteers",
        Icon: PeopleIcon,
        tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    },
    syllabus: {
        title: "Syllabus",
        description: "Chapters, concepts, worksheets and tests",
        href: "/syllabus",
        Icon: BookIcon,
        tone: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    },
    goals: {
        title: "Goals & progress",
        description: "Exam goals and what each student has covered",
        href: "/goals",
        Icon: TargetIcon,
        tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    },
    resources: {
        title: "Resources",
        description: "Guides, materials and forms",
        href: "/resources",
        Icon: LinkIcon,
        tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    },
};

/** The section's icon on its coloured square. */
export function SectionIcon({ section, className = "size-12 rounded-xl" }: { section: SectionKey; className?: string }) {
    const { Icon, tone } = SECTIONS[section];
    return (
        <span aria-hidden className={`flex shrink-0 items-center justify-center ${tone} ${className}`}>
            <Icon />
        </span>
    );
}
